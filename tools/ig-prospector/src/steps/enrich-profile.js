/**
 * Step 3: enrich-profile. Fetch Instagram profile data via Apify for every resolved handle not yet enriched.
 * Batches handles per actor run (cheaper than one run per handle); caches per handle in cache/apify-ig/<handle>.json.
 * A handle the actor did not return (deleted, private, blocked) is still written with profile_found=false so it is never re-spent.
 * Output: data/profiles.ndjson (resolved row + profile fields).
 * Handles that came from Instagram user search already carry profile fields in the raw search dataset
 * (data/raw/ig-search/); those are used as-is (no post history, so last_post_at stays null) instead of being re-bought.
 * Usage: node src/steps/enrich-profile.js [--force] [--limit N] [--no-spend: cache and search data only, leave the rest pending]
 */
import { parseArgs } from '../lib/cli.js';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDirs, readConfig, FILES, RAW_DIR } from '../lib/paths.js';
import { readNdjsonMap, appendNdjson, removeFromNdjson, pruneOrphans, compactNdjson } from '../lib/ndjson.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { runActor } from '../lib/apify.js';
import { pick, fillTemplate } from '../lib/fields.js';
import { normalizeHandle } from '../lib/handles.js';
import { cleanUrl } from '../lib/http.js';
import { toEpochMs, daysBetween, isoDate } from '../lib/time.js';
import { createLimiter } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';
import { loadJoined } from '../lib/records.js';

const args = parseArgs();
ensureDirs();
const cfg = readConfig('actors.json').instagram_profile;
const F = cfg.fields;

const resolved = [...loadJoined(['resolved']).values()];
pruneOrphans(FILES.profiles, new Set(resolved.map((r) => r.ig_handle)));
const done = readNdjsonMap(FILES.profiles);
let pending = resolved.filter((r) => args.force || !done.has(r.ig_handle)).slice(0, args.limit);
if (args.force) removeFromNdjson(FILES.profiles, new Set(pending.map((r) => r.ig_handle)));

const progress = createProgress('enrich-profile', pending.length);
const CACHE_NS = 'apify-ig';

function profileFromItem(item) {
  const posts = pick(item, F.latest_posts);
  const stamps = Array.isArray(posts) ? posts.map((p) => toEpochMs(pick(p, F.post_timestamp))).filter(Boolean) : [];
  const last = stamps.length ? Math.max(...stamps) : null;
  return {
    profile_found: true,
    full_name: pick(item, F.full_name) ?? null,
    bio: pick(item, F.biography) ?? '',
    bio_link: cleanUrl(pick(item, F.external_url)) ?? null,
    follower_count: Number(pick(item, F.followers) ?? 0) || 0,
    post_count: Number(pick(item, F.posts) ?? 0) || 0,
    is_private: Boolean(pick(item, F.is_private)),
    last_post_at: isoDate(last),
    days_since_last_post: daysBetween(last),
  };
}

function writeRow(base, profile) {
  const row = { ig_handle: base.ig_handle, ...profile, profile_fetched_at: new Date().toISOString() }; // own fields only
  done.set(base.ig_handle, row);
  appendNdjson(FILES.profiles, row);
}

// 0) Profiles already present in the Instagram search datasets (same fields minus post history).
function loadSearchProfiles() {
  const dir = path.join(RAW_DIR, 'ig-search'); const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const it of p.items || []) {
      const h = normalizeHandle(pick(it, F.username));
      if (h && pick(it, F.followers) != null && !pick(it, F.error) && !out.has(h)) out.set(h, { item: it, run_id: `ig-search:${p.niche ?? f}` });
    }
  }
  return out;
}
const fromSearch = loadSearchProfiles();

// 1) Serve from cache first (zero credits), then from search data.
const needFetch = []; let servedFromSearch = 0;
for (const r of pending) {
  const hit = args.force ? null : cacheGet(CACHE_NS, r.ig_handle);
  if (hit) { writeRow(r, hit.value.item ? profileFromItem(hit.value.item) : { profile_found: false, profile_error: hit.value.error || 'not_returned' }); progress.skip(); progress.tick(`@${r.ig_handle} (cache)`); }
  else if (fromSearch.has(r.ig_handle)) { const v = fromSearch.get(r.ig_handle); cacheSet(CACHE_NS, r.ig_handle, v); writeRow(r, { ...profileFromItem(v.item), profile_source: 'ig_search' }); servedFromSearch++; progress.skip(); progress.tick(`@${r.ig_handle} (search data)`); }
  else needFetch.push(r);
}
if (servedFromSearch) console.log(`[enrich-profile] ${servedFromSearch} profile(s) taken from Instagram search data (no post history)`);
if (args.noSpend && needFetch.length) { console.log(`[enrich-profile] --no-spend: ${needFetch.length} handle(s) left pending`); needFetch.length = 0; }

// 2) Fetch the rest in batches, concurrency 3.
const batches = [];
for (let i = 0; i < needFetch.length; i += cfg.batch_size) batches.push(needFetch.slice(i, i + cfg.batch_size));
const limit = createLimiter(3);
await Promise.all(batches.map((batch, bi) => limit(async () => {
  const usernames = batch.map((r) => r.ig_handle);
  try {
    const input = fillTemplate(cfg.input_template, { usernames });
    const { items, run } = await runActor(cfg.actor_id, input, { timeoutSecs: cfg.timeout_secs, maxTotalChargeUsd: cfg.max_total_charge_usd_per_run, label: `ig batch ${bi + 1}/${batches.length}` });
    progress.spend({ provider: 'apify', units: usernames.length, usd: run.usageTotalUsd, detail: { actor: cfg.actor_id, run_id: run.id, batch: bi + 1, requested: usernames.length, returned: items.length } });
    const byHandle = new Map();
    for (const it of items) { const h = normalizeHandle(pick(it, F.username)); if (h) byHandle.set(h, it); }
    for (const r of batch) {
      const it = byHandle.get(r.ig_handle);
      const errText = it ? pick(it, F.error) : null;
      if (it && !errText) { cacheSet(CACHE_NS, r.ig_handle, { item: it, run_id: run.id }); writeRow(r, profileFromItem(it)); progress.tick(`@${r.ig_handle} followers=${pick(it, F.followers)}`); }
      else { cacheSet(CACHE_NS, r.ig_handle, { item: null, error: errText || 'not_returned', run_id: run.id }); writeRow(r, { profile_found: false, profile_error: errText || 'not_returned' }); progress.tick(`@${r.ig_handle} NOT FOUND`); }
    }
  } catch (err) {
    for (const r of batch) progress.fail(`@${r.ig_handle} batch failed: ${err.message}`);
  }
})));
progress.done();
if (progress.state.failed) process.exitCode = 1;
compactNdjson(FILES.profiles);
