/**
 * Seed source: Instagram user search via Apify, one actor run per niche (all its ig_queries in one run).
 * Raw dataset: data/raw/ig-search/<niche>-<inputhash>.json; seeds: data/raw/seeds/ig_search/<niche>-<hash>.json.
 * Cached by (actor, input) hash so a rerun with the same queries spends nothing.
 * Usage: node src/steps/source-ig-search.js [--force] [--limit N niches] [--niche key]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, RAW_DIR } from '../lib/paths.js';
import { cacheGet, cacheSet, sha } from '../lib/cache.js';
import { runActor } from '../lib/apify.js';
import { pick } from '../lib/fields.js';
import { normalizeHandle } from '../lib/handles.js';
import { createProgress } from '../lib/log.js';
import { writeSeedFile } from '../lib/seeds.js';

const args = parseArgs();
ensureDirs();
const cfg = readConfig('ig-search.json'); const F = cfg.fields;
const minFollowers = readConfig('criteria.json').min_followers ?? 0; // the search result carries a follower count: skip rows the hard rules would reject before paying to enrich them
let niches = readConfig('niches.json').niches;
if (args.niche) niches = niches.filter((n) => n.key === args.niche);
niches = niches.slice(0, args.limit);
const outDir = path.join(RAW_DIR, 'ig-search');
fs.mkdirSync(outDir, { recursive: true });
const progress = createProgress('source:ig-search', niches.length);

for (const niche of niches) {
  const input = { search: niche.ig_queries.join(', '), searchType: cfg.search_type, searchLimit: cfg.results_per_query };
  const key = sha({ actor: cfg.actor_id, input });
  const outFile = path.join(outDir, `${niche.key}-${key.slice(0, 8)}.json`);
  let items;
  if (!args.force && cacheGet('apify-ig-search', key) && fs.existsSync(outFile)) { items = JSON.parse(fs.readFileSync(outFile, 'utf8')).items; progress.skip(); }
  else {
    try {
      const res = await runActor(cfg.actor_id, input, { timeoutSecs: cfg.timeout_secs, maxTotalChargeUsd: cfg.max_total_charge_usd_per_run, maxItems: cfg.results_per_query * niche.ig_queries.length, label: niche.key });
      items = res.items;
      fs.writeFileSync(outFile, JSON.stringify({ niche: niche.key, actor_id: cfg.actor_id, input, run: res.run, fetched_at: new Date().toISOString(), items }, null, 2));
      cacheSet('apify-ig-search', key, { niche: niche.key, outFile, run: res.run });
      progress.spend({ provider: 'apify', units: items.length, usd: res.run.usageTotalUsd, detail: { actor: cfg.actor_id, niche: niche.key, run_id: res.run.id } });
      progress.tick(`${niche.key} -> ${items.length} results`);
    } catch (err) { progress.fail(`${niche.key} FAILED: ${err.message}`); continue; }
  }
  const seen = new Set(); const seeds = []; let belowFloor = 0;
  for (const it of items) {
    const h = normalizeHandle(pick(it, F.username));
    if (!h || seen.has(h)) continue; seen.add(h);
    const followers = pick(it, F.followers);
    if ((followers != null && Number(followers) < minFollowers) || it.private === true) { belowFloor++; continue; }
    seeds.push({ ig_handle: h, name: pick(it, F.full_name) ?? null, extra: { search_query: pick(it, F.search_term) ?? null, niche_key: niche.key, search_followers: followers != null ? Number(followers) : null } });
  }
  if (seeds.length) console.log(`[source:ig-search] ${niche.key}: ${seeds.length} handles (${belowFloor} skipped: private or under ${minFollowers} followers) -> ${writeSeedFile('ig_search', niche.key, `ig_search:${niche.key}`, seeds)}`);
}
progress.done();
if (progress.state.failed) process.exitCode = 1;
