/**
 * Step 5: classify. Bio + funnel text -> strict JSON via the Anthropic API (the only LLM call in the pipeline).
 * Cached per handle by a hash of (prompt_version, model, bio, funnel text) so unchanged inputs cost zero on rerun.
 * Parse/validation failure: one retry, then the row goes to data/classify-failures.ndjson with the raw text.
 * Output: data/classified.ndjson (funnel row + classification fields).
 * Usage: node src/steps/classify.js [--force] [--limit N]
 */
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, FILES } from '../lib/paths.js';
import { readNdjson, readNdjsonMap, appendNdjson, removeFromNdjson } from '../lib/ndjson.js';
import { cacheGet, cacheSet, sha } from '../lib/cache.js';
import { classifyProspect, SYSTEM_PROMPT } from '../lib/anthropic.js';
import { createLimiter } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';

const args = parseArgs();
ensureDirs();
const cfg = readConfig('classify.json');

const funnels = readNdjson(FILES.funnels);
const done = readNdjsonMap(FILES.classified);
const pending = funnels.filter((r) => args.force || !done.has(r.ig_handle)).slice(0, args.limit);
if (args.force) removeFromNdjson(FILES.classified, new Set(pending.map((r) => r.ig_handle)));
const progress = createProgress('classify', pending.length);
const limit = createLimiter(3);
const promptHash = sha(SYSTEM_PROMPT);

await Promise.all(pending.map((r) => limit(async () => {
  const input = { handle: r.ig_handle, bio: r.bio || '', bioLink: r.bio_link, funnelUrl: r.funnel_final_url || r.funnel_url, funnelText: r.funnel_text || '', followerCount: r.follower_count };
  const cacheKey = sha({ v: cfg.prompt_version, promptHash, model: cfg.model, input });
  let result = args.force ? null : cacheGet('anthropic', cacheKey)?.value;
  if (result) progress.skip();
  else {
    try {
      result = await classifyProspect(input, cfg);
      cacheSet('anthropic', cacheKey, result);
      progress.spend({ provider: 'anthropic', units: 1, usd: result.usd, detail: { handle: r.ig_handle, model: result.model, usage: result.usage, attempts: result.attempts } });
    } catch (err) {
      if (err.usd) progress.spend({ provider: 'anthropic', units: 1, usd: err.usd, detail: { handle: r.ig_handle, failed: true } });
      appendNdjson(FILES.classifyFailures, { ig_handle: r.ig_handle, error: err.message, raw: err.raw ?? null, ts: new Date().toISOString() });
      progress.fail(`@${r.ig_handle} ${err.message}`);
      return;
    }
  }
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
  progress.tick(`@${r.ig_handle} ${c.niche}/${c.funnel_type} $${c.offer_price_usd ?? '?'} conf=${c.confidence}`);
})));
progress.done();
if (progress.state.failed) process.exitCode = 1;
