/**
 * Step 5: classify. Bio + funnel text -> strict JSON. The only LLM step in the pipeline; extraction, not judgment.
 *
 * No API key and no model call from this process. `npm run classify` first ingests any answers found in
 * data/classify-answers.ndjson (validated against the schema, matched to the current input by hash), then writes the
 * still-pending inputs to data/classify-queue.ndjson plus data/classify-instructions.md for whoever does the
 * classifying (a Claude Code session or sub-agents). Run it again after the answers are written.
 * Results are cached under cache/classify keyed by a hash of (prompt_version, prompt, input), so an unchanged input is
 * never classified twice. Invalid answers go to data/classify-failures.ndjson.
 * Output: data/classified.ndjson (funnel row + classification fields).
 * Usage: node src/steps/classify.js [--force] [--limit N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, FILES, DATA_DIR } from '../lib/paths.js';
import { readNdjsonMap, appendNdjson, removeFromNdjson, writeNdjson, pruneOrphans, compactNdjson } from '../lib/ndjson.js';
import { cacheGet, cacheSet, sha } from '../lib/cache.js';
import { SYSTEM_PROMPT, ClassificationSchema, CLASSIFICATION_JSON_SCHEMA } from '../lib/classification.js';
import { loadCriteria, buildPreRules, evaluate } from '../lib/criteria.js';
import { loadJoined } from '../lib/records.js';

const args = parseArgs();
ensureDirs();
const cfg = readConfig('classify.json');
const CACHE_NS = 'classify';
const QUEUE = path.join(DATA_DIR, 'classify-queue.ndjson');
const ANSWERS = path.join(DATA_DIR, 'classify-answers.ndjson');
const INSTRUCTIONS = path.join(DATA_DIR, 'classify-instructions.md');

const promptHash = sha(SYSTEM_PROMPT);

export function buildInput(r) {
  return { handle: r.ig_handle, bio: r.bio || '', bioLink: r.bio_link ?? null, funnelUrl: r.funnel_final_url || r.funnel_url || null, funnelText: (r.funnel_text || '').slice(0, cfg.max_funnel_chars), followerCount: r.follower_count ?? null };
}
// The literal 'agent' stays in the key: every cached classification was written under it, and changing the shape of
// this object would invalidate all of them and re-queue the whole list.
const keyFor = (input) => sha({ v: cfg.prompt_version, promptHash, model: 'agent', input });

const funnels = [...loadJoined(['resolved', 'profiles', 'funnels']).values()];
pruneOrphans(FILES.classified, new Set(funnels.map((r) => r.ig_handle)));
const done = readNdjsonMap(FILES.classified);
// Only classify rows that can still qualify: rows failing a pre-classification rule (followers, ad age, post recency,
// profile found) are skipped here and reported by the filter step with the rule that killed them.
const preRules = buildPreRules(loadCriteria());
const candidates = funnels.filter((r) => !evaluate(preRules, r));
console.log(`[classify] ${funnels.length} enriched rows, ${candidates.length} pass pre-classification rules`);
// A classified row whose input (bio, funnel text) has changed since is stale and gets re-queued.
const isCurrent = (r) => done.has(r.ig_handle) && done.get(r.ig_handle).classification_input_hash === keyFor(buildInput(r));
const pending = candidates.filter((r) => args.force || !isCurrent(r)).slice(0, args.limit);
if (args.force) removeFromNdjson(FILES.classified, new Set(pending.map((r) => r.ig_handle)));

function writeClassified(r, result) {
  const c = result.classification;
  const row = { // own fields only
    ig_handle: r.ig_handle,
    classification_input_hash: keyFor(buildInput(r)),
    first_name: c.owner_first_name,
    last_name: c.owner_last_name,
    business_type: c.business_type,
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
compactNdjson(FILES.classified);
