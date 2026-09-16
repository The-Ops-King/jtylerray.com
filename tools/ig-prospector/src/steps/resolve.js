/**
 * Step 2: resolve. Raw ads -> one row per advertiser page -> Instagram handle (primary key) + funnel URL + ad activity.
 * Handle sources, in order: the ad's instagram_actor_name, an instagram.com link in the ad, an instagram link on the
 * funnel page (free HTTP fetch, cached). Pages with no handle go to data/unresolved.ndjson with the reason.
 * Seed files (data/raw/seeds/<source>/, written by the source:* steps) already carry a handle; they are folded in after
 * the ad pages so an advertiser that also shows up as a seed keeps its ad signals.
 * Output: data/resolved.ndjson keyed by ig_handle. Rebuilt in full on every run (free: HTML fetches are cached), so a
 * change to the raw data or the ignore list is reflected immediately; date_sourced is preserved from the previous file.
 * Usage: node src/steps/resolve.js [--force: refetch funnel pages] [--no-fetch]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, RAW_DIR, FILES, DATA_DIR } from '../lib/paths.js';
import { readNdjsonMap, writeNdjson } from '../lib/ndjson.js';
import { pick } from '../lib/fields.js';
import { normalizeHandle, handleFromUrl, findHandleInHtml, igUrl } from '../lib/handles.js';
import { cleanUrl, fetchHtml, isSocial } from '../lib/http.js';
import { toEpochMs, daysBetween, isoDate, TODAY } from '../lib/time.js';
import { createLimiter } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';
import { loadSeeds } from '../lib/seeds.js';

const args = parseArgs();
ensureDirs();
const F = readConfig('actors.json').ad_library.fields;
const IGNORED = new Set(readConfig('resolve.json').ignored_handles.map((h) => h.toLowerCase()));
const keep = (h) => (h && !IGNORED.has(h) ? h : null);
const discovered = readNdjsonMap(path.join(DATA_DIR, 'discovered.ndjson'), 'page_id');

function loadRaw() {
  const out = [];
  const adlib = path.join(RAW_DIR, 'adlib');
  if (fs.existsSync(adlib)) for (const f of fs.readdirSync(adlib).filter((x) => x.endsWith('.json'))) {
    const p = JSON.parse(fs.readFileSync(path.join(adlib, f), 'utf8'));
    for (const item of p.items || []) out.push({ item, source: 'adlibrary', source_detail: p.term });
  }
  const manual = path.join(RAW_DIR, 'manual');
  if (fs.existsSync(manual)) for (const f of fs.readdirSync(manual).filter((x) => x.endsWith('.json'))) {
    const rows = JSON.parse(fs.readFileSync(path.join(manual, f), 'utf8'));
    for (const r of Array.isArray(rows) ? rows : rows.items || []) out.push({ item: r, source: 'manual', source_detail: r.source_detail || f.replace(/\.json$/, '') });
  }
  return out;
}

const truthy = (v) => v === true || v === 'true' || v === 1 || v === 'ACTIVE' || v === 'active';
const mostCommon = (arr) => { const c = new Map(); for (const a of arr) c.set(a, (c.get(a) || 0) + 1); return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; };

// Group ads by advertiser page. The same ad can appear in several runs (overlapping samples), so count each ad id once.
const pages = new Map();
const seenAds = new Set();
for (const { item, source, source_detail } of loadRaw()) {
  const adId = pick(item, F.ad_id);
  if (adId != null) { const k = `${source}:${adId}`; if (seenAds.has(k)) continue; seenAds.add(k); }
  const pageId = String(pick(item, F.page_id) ?? pick(item, F.page_name) ?? '');
  if (!pageId) continue;
  const key = `${source}:${pageId}`;
  if (!pages.has(key)) pages.set(key, { page_id: pageId, page_name: pick(item, F.page_name), source, terms: new Set(), handles: [], links: [], starts: [], active: 0, ads: 0, profile_uris: [], likes: null, texts: [] });
  const p = pages.get(key);
  p.ads++;
  p.terms.add(source_detail);
  const h = keep(normalizeHandle(pick(item, F.ig_handle))) || keep(handleFromUrl(cleanUrl(pick(item, F.link_url)) || pick(item, F.link_url))) || keep(handleFromUrl(pick(item, F.page_profile_uri)));
  if (h) p.handles.push(h);
  const link = cleanUrl(pick(item, F.link_url));
  if (link && !isSocial(link)) p.links.push(link);
  const uri = pick(item, F.page_profile_uri); if (uri) p.profile_uris.push(uri);
  const likes = pick(item, F.page_like_count); if (likes != null) p.likes = Number(likes);
  const text = pick(item, F.ad_text); if (text && p.texts.length < 2) p.texts.push(String(text).slice(0, 240));
  const start = toEpochMs(pick(item, F.start_date)); if (start) p.starts.push(start);
  const active = pick(item, F.is_active); if (active == null || truthy(active)) p.active++;
}

const previous = readNdjsonMap(FILES.resolved);
const existing = new Map();
const unresolvedRows = [];
const progress = createProgress('resolve', pages.size);
const limit = createLimiter(3);

await Promise.all([...pages.values()].map((p) => limit(async () => {
  let handle = mostCommon(p.handles);
  const funnel_url = mostCommon(p.links);
  let handle_source = handle ? 'ad' : null;
  if (!handle && funnel_url && !args.noFetch) {
    const page = await fetchHtml(funnel_url, { force: args.force });
    handle = findHandleInHtml(page.html, IGNORED);
    if (handle) handle_source = 'funnel_page';
  }
  if (!handle && discovered.get(p.page_id)?.ig_handle) { handle = keep(discovered.get(p.page_id).ig_handle); if (handle) handle_source = 'discovered'; }
  if (!handle) {
    unresolvedRows.push({ page_id: p.page_id, page_name: p.page_name, source: p.source, source_detail: [...p.terms].join('; '), funnel_url, page_profile_uri: p.profile_uris[0] ?? null, page_like_count: p.likes, ad_text: p.texts.join(' | ') || null, ads: p.ads, ad_days_active: daysBetween(p.starts.length ? Math.min(...p.starts) : null), searched: discovered.has(p.page_id), reason: discovered.has(p.page_id) ? 'searched_no_instagram_found' : funnel_url ? 'no_instagram_link_in_ads_or_funnel' : 'no_instagram_link_and_no_funnel_url' });
    progress.fail(`${p.page_name} unresolved`);
    return;
  }
  if (existing.has(handle)) { progress.skip(); return; } // two pages resolving to one handle: first wins
  const firstStart = p.starts.length ? Math.min(...p.starts) : null;
  const row = {
    ig_handle: handle,
    ig_url: igUrl(handle),
    handle_source,
    page_id: p.page_id,
    page_name: p.page_name,
    funnel_url,
    ads_running: p.active,
    ads_seen: p.ads,
    ad_first_seen: isoDate(firstStart),
    ad_days_active: daysBetween(firstStart),
    source: p.source,
    source_detail: [...p.terms].join('; '),
    date_sourced: previous.get(handle)?.date_sourced ?? TODAY,
  };
  existing.set(handle, row);
  progress.tick(`@${handle} (${handle_source}) ads=${p.active}/${p.ads} days=${row.ad_days_active}`);
})));
// Seeds: handle already known, no ads. First occurrence wins; an advertiser row for the same handle always wins.
let seeded = 0;
for (const { item, source, source_detail } of loadSeeds()) {
  const handle = keep(normalizeHandle(item.ig_handle));
  if (!handle || existing.has(handle)) continue;
  const funnel_url = cleanUrl(item.funnel_url);
  existing.set(handle, {
    ig_handle: handle,
    ig_url: igUrl(handle),
    handle_source: 'seed',
    page_id: item.page_id || `${source}:${handle}`,
    page_name: item.name ?? null,
    funnel_url: funnel_url && !isSocial(funnel_url) ? funnel_url : null,
    ads_running: 0,
    ads_seen: 0,
    ad_first_seen: null,
    ad_days_active: null,
    source,
    source_detail,
    date_sourced: previous.get(handle)?.date_sourced ?? TODAY,
    ...(item.extra || {}),
  });
  seeded++;
}
writeNdjson(FILES.resolved, [...existing.values()]);
writeNdjson(FILES.unresolved, unresolvedRows);
progress.done();
console.log(`resolved: ${existing.size} handles (${seeded} from seeds) | unresolved pages: ${unresolvedRows.length} -> ${FILES.unresolved}`);
