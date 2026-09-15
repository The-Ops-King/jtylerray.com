/**
 * Step 1: source. Pull advertisers from the Meta Ad Library via an Apify actor, one run per search term.
 * Output: data/raw/adlib/<term-slug>-<inputhash>.json (raw dataset, untouched) + run metadata. Cached by (actor, input) hash;
 * every run gets its own file, so raw data only ever accumulates.
 * Hand-imported advertisers: drop JSON files into data/raw/manual/ (see README) - they are picked up by resolve.
 * Usage: node src/steps/source.js [--force] [--limit N terms]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, RAW_DIR } from '../lib/paths.js';
import { cacheGet, cacheSet, sha } from '../lib/cache.js';
import { runActor } from '../lib/apify.js';
import { fillTemplate } from '../lib/fields.js';
import { createLimiter } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';

const args = parseArgs();
ensureDirs();
const terms = readConfig('search-terms.json');
const actorCfg = readConfig('actors.json').ad_library;
const outDir = path.join(RAW_DIR, 'adlib');
fs.mkdirSync(outDir, { recursive: true });

export function adLibrarySearchUrl(term, { country = 'US', active_status = 'active' } = {}) {
  const u = new URL('https://www.facebook.com/ads/library/');
  u.searchParams.set('active_status', active_status);
  u.searchParams.set('ad_type', 'all');
  u.searchParams.set('country', country);
  u.searchParams.set('q', term);
  u.searchParams.set('search_type', 'keyword_unordered');
  u.searchParams.set('media_type', 'all');
  return u.toString();
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const todo = terms.terms.slice(0, args.limit);
const progress = createProgress('source', todo.length);
const limit = createLimiter(3);

await Promise.all(todo.map((term) => limit(async () => {
  const search_url = adLibrarySearchUrl(term, terms);
  const input = fillTemplate(actorCfg.input_template, { search_url, max_ads: terms.max_ads_per_term, active_status: terms.active_status, country: terms.country, term });
  const cacheKey = sha({ actor: actorCfg.actor_id, input });
  // One file per (term, input) so a rerun with a different count or a --force never overwrites an earlier sample.
  const outFile = path.join(outDir, `${slug(term)}-${cacheKey.slice(0, 8)}.json`);
  if (!args.force && cacheGet('apify-adlib', cacheKey) && fs.existsSync(outFile)) { progress.skip(); return; }
  try {
    const { items, run } = await runActor(actorCfg.actor_id, input, { timeoutSecs: actorCfg.timeout_secs, maxTotalChargeUsd: actorCfg.max_total_charge_usd_per_run, maxItems: terms.max_ads_per_term, label: term });
    const payload = { term, search_url, actor_id: actorCfg.actor_id, input, run, fetched_at: new Date().toISOString(), items };
    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
    cacheSet('apify-adlib', cacheKey, { term, outFile, run });
    progress.spend({ provider: 'apify', units: items.length, usd: run.usageTotalUsd, detail: { actor: actorCfg.actor_id, term, run_id: run.id } });
    progress.tick(`"${term}" -> ${items.length} ads`);
  } catch (err) {
    progress.fail(`"${term}" FAILED: ${err.message}`);
  }
})));
progress.done();
if (progress.state.failed) process.exitCode = 1;
