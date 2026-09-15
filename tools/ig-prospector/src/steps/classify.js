/**
 * Step 5: classify. Bio + funnel text -> strict JSON. The only LLM step in the pipeline; extraction, not judgment.
 *
 * Two modes (config/classify.json "mode"):
 *   "agent" (default): no API key. `npm run classify` first ingests any answers found in data/classify-answers.ndjson
 *     (validated against the schema, matched to the current input by hash), then writes the still-pending inputs to
 *     data/classify-queue.ndjson plus data/classify-instructions.md for whoever does the classifying (a Claude Code
 *     session or sub-agents). Run it again after answers are written.
 *   "api": calls the Anthropic API directly (needs ANTHROPIC_API_KEY).
 * Results in either mode are cached under cache/classify keyed by a hash of (prompt_version, prompt, model, input),
 * so an unchanged input never costs anything again. Invalid answers go to data/classify-failures.ndjson.
 * Output: data/classified.ndjson (funnel row + classification fields).
 * Usage: node src/steps/classify.js [--force] [--limit N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, FILES, DATA_DIR } from '../lib/paths.js';
import { readNdjson, readNdjsonMap, appendNdjson, removeFromNdjson, writeNdjson, pruneOrphans } from '../lib/ndjson.js';
import { cacheGet, cacheSet, sha } from '../lib/cache.js';
import { SYSTEM_PROMPT, ClassificationSchema, CLASSIFICATION_JSON_SCHEMA } from '../lib/anthropic.js';
import { createLimiter } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';

const args = parseArgs();
ensureDirs();
const cfg = readConfig('classify.json');
const mode = cfg.mode || 'agent';
if (!['agent', 'api'].includes(mode)) throw new Error(`config/classify.json mode must be "agent" or "api", got ${mode}`);
const CACHE_NS = 'classify';
const QUEUE = path.join(DATA_DIR, 'classify-queue.ndjson');
const ANSWERS = path.join(DATA_DIR, 'classify-answers.ndjson');
const INSTRUCTIONS = path.join(DATA_DIR, 'classify-instructions.md');

const funnels = readNdjson(FILES.funnels);
pruneOrphans(FILES.classified, new Set(funnels.map((r) => r.ig_handle)));
const done = readNdjsonMap(FILES.classified);
const pending = funnels.filter((r) => args.force || !done.has(r.ig_handle)).slice(0, args.limit);
if (args.force) removeFromNdjson(FILES.classified, new Set(pending.map((r) => r.ig_handle)));
const promptHash = sha(SYSTEM_PROMPT);
const modelTag = mode === 'agent' ? 'agent' : cfg.model;

export function buildInput(r) {
  return { handle: r.ig_handle, bio: r.bio || '', bioLink: r.bio_link ?? null, funnelUrl: r.funnel_final_url || r.funnel_url || null, funnelText: (r.funnel_text || '').slice(0, cfg.max_funnel_chars), followerCount: r.follower_count ?? null };
}
const keyFor = (input) => sha({ v: cfg.prompt_version, promptHash, model: modelTag, input });

function writeClassified(r, result) {
  const c = result.classification;
  const row = {
    ...r,
    first_name: c.owner_first_name,
    last_name: c.owner_last_name,
    niche: c.niche,
    funnel_type: c.funnel_type,
    offer_price: c.offer_price_usd,
    sells_to_beginner_coaches: c.sells_to_coaches_about_getting_first_client,
    is_agency: c.is_agency_or_systems_provider,
    team_signal: c.team_signal,
    classification_confidence: c.confidence,
    classification_model: result.model,
    classified_at: new Date().toISOString(),
  };
  done.set(r.ig_handle, row);
  appendNdjson(FILES.classified, row);
  return c;
}

const progress = createProgress('classify', pending.length);

if (mode === 'api') {
  const { classifyProspect } = await import('../lib/anthropic.js');
  const limit = createLimiter(3);
  await Promise.all(pending.map((r) => limit(async () => {
    const input = buildInput(r);
    const cacheKey = keyFor(input);
    let result = args.force ? null : cacheGet(CACHE_NS, cacheKey)?.value;
    if (result) progress.skip();
    else {
      try {
        result = await classifyProspect(input, cfg);
        cacheSet(CACHE_NS, cacheKey, result);
        progress.spend({ provider: 'anthropic', units: 1, usd: result.usd, detail: { handle: r.ig_handle, model: result.model, usage: result.usage, attempts: result.attempts } });
      } catch (err) {
        if (err.usd) progress.spend({ provider: 'anthropic', units: 1, usd: err.usd, detail: { handle: r.ig_handle, failed: true } });
        appendNdjson(FILES.classifyFailures, { ig_handle: r.ig_handle, error: err.message, raw: err.raw ?? null, ts: new Date().toISOString() });
        progress.fail(`@${r.ig_handle} ${err.message}`);
        return;
      }
    }
    const c = writeClassified(r, result);
    progress.tick(`@${r.ig_handle} ${c.niche}/${c.funnel_type} $${c.offer_price_usd ?? '?'} conf=${c.confidence}`);
  })));
  progress.done();
  if (progress.state.failed) process.exitCode = 1;
} else {
  // 1) Ingest answers: validate, match hash, cache, write.
  const answers = readNdjsonMap(ANSWERS);
  const byHandle = new Map(pending.map((r) => [r.ig_handle, r]));
  let ingested = 0, rejected = 0;
  for (const [handle, a] of answers) {
    const r = byHandle.get(handle);
    if (!r) continue; // already classified or not pending
    const input = buildInput(r);
    const cacheKey = keyFor(input);
    if (a.input_hash !== cacheKey) { appendNdjson(FILES.classifyFailures, { ig_handle: handle, error: `stale answer: input_hash ${a.input_hash} != current ${cacheKey}`, ts: new Date().toISOString() }); rejected++; continue; }
    const parsed = ClassificationSchema.safeParse(a.classification);
    if (!parsed.success) { appendNdjson(FILES.classifyFailures, { ig_handle: handle, error: `schema: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`, raw: a.classification, ts: new Date().toISOString() }); rejected++; continue; }
    const result = { classification: parsed.data, model: a.model || 'agent', usd: 0, attempts: 1 };
    cacheSet(CACHE_NS, cacheKey, result);
    writeClassified(r, result);
    byHandle.delete(handle);
    ingested++;
  }
  // 2) Cache hits (e.g. a rerun after --force, or an answer produced under the same hash before).
  let cached = 0;
  for (const [handle, r] of [...byHandle]) {
    const hit = args.force ? null : cacheGet(CACHE_NS, keyFor(buildInput(r)))?.value;
    if (hit) { writeClassified(r, hit); byHandle.delete(handle); cached++; }
  }
  // 3) Queue what is still pending.
  const queue = [...byHandle.values()].map((r) => { const input = buildInput(r); return { ig_handle: r.ig_handle, input_hash: keyFor(input), ...input }; });
  writeNdjson(QUEUE, queue);
  fs.writeFileSync(INSTRUCTIONS, instructions(queue.length));
  console.log(`[classify:agent] ingested ${ingested} answer(s), ${rejected} rejected -> ${path.basename(FILES.classifyFailures)}, ${cached} from cache, ${queue.length} still pending`);
  if (queue.length) console.log(`[classify:agent] queue: ${QUEUE}\n[classify:agent] instructions: ${INSTRUCTIONS}\n[classify:agent] write answers to ${ANSWERS} then rerun this step`);
  if (rejected) process.exitCode = 1;
}

function instructions(n) {
  return `# Classification instructions (generated, ${new Date().toISOString()})

${n} record(s) are waiting in \`data/classify-queue.ndjson\`. Each line has: ig_handle, input_hash, handle, bio, bioLink, funnelUrl, funnelText, followerCount.

For each line, produce exactly one JSON object matching the schema below and append one line to \`data/classify-answers.ndjson\`:

\`\`\`json
{"ig_handle": "<ig_handle from the queue>", "input_hash": "<input_hash from the queue, copied verbatim>", "model": "<who classified, e.g. claude-code-session>", "classification": { ...schema object... }}
\`\`\`

Copy input_hash exactly: an answer whose hash does not match the current input is rejected as stale. Then run \`npm run classify\` again; it validates every answer against the schema, writes the good ones, and reports the bad ones in \`data/classify-failures.ndjson\`.

## Prompt (follow it literally)

${SYSTEM_PROMPT}

## Output schema

\`\`\`json
${JSON.stringify(CLASSIFICATION_JSON_SCHEMA, null, 2)}
\`\`\`
`;
}
