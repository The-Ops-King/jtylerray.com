/**
 * Step 2: resolve. Raw ads -> one row per advertiser page -> Instagram handle (primary key) + funnel URL + ad activity.
 * Handle sources, in order: the ad's instagram_actor_name, an instagram.com link in the ad, an instagram link on the
 * funnel page (free HTTP fetch, cached). Pages with no handle go to data/unresolved.ndjson with the reason.
 * Output: data/resolved.ndjson keyed by ig_handle. Cheap step: safe to rerun with --force.
 * Usage: node src/steps/resolve.js [--force] [--no-fetch]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, RAW_DIR, FILES } from '../lib/paths.js';
import { readNdjsonMap, appendNdjson, writeNdjson } from '../lib/ndjson.js';
import { pick } from '../lib/fields.js';
import { normalizeHandle, handleFromUrl, findHandleInHtml, igUrl } from '../lib/handles.js';
import { cleanUrl, fetchHtml, isSocial } from '../lib/http.js';
import { toEpochMs, daysBetween, isoDate, TODAY } from '../lib/time.js';
import { createLimiter } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';

const args = parseArgs();
ensureDirs();
const F = readConfig('actors.json').ad_library.fields;

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

// Group ads by advertiser page.
const pages = new Map();
for (const { item, source, source_detail } of loadRaw()) {
  const pageId = String(pick(item, F.page_id) ?? pick(item, F.page_name) ?? '');
  if (!pageId) continue;
  const key = `${source}:${pageId}`;
  if (!pages.has(key)) pages.set(key, { page_id: pageId, page_name: pick(item, F.page_name), source, terms: new Set(), handles: [], links: [], starts: [], active: 0, ads: 0, profile_uris: [] });
  const p = pages.get(key);
  p.ads++;
  p.terms.add(source_detail);
  const h = normalizeHandle(pick(item, F.ig_handle)) || handleFromUrl(cleanUrl(pick(item, F.link_url)) || pick(item, F.link_url)) || handleFromUrl(pick(item, F.page_profile_uri));
  if (h) p.handles.push(h);
  const link = cleanUrl(pick(item, F.link_url));
  if (link && !isSocial(link)) p.links.push(link);
  const uri = pick(item, F.page_profile_uri); if (uri) p.profile_uris.push(uri);
  const start = toEpochMs(pick(item, F.start_date)); if (start) p.starts.push(start);
  const active = pick(item, F.is_active); if (active == null || truthy(active)) p.active++;
}

const existing = args.force ? new Map() : readNdjsonMap(FILES.resolved);
if (args.force) { writeNdjson(FILES.resolved, []); writeNdjson(FILES.unresolved, []); }
const unresolvedRows = [];
const progress = createProgress('resolve', pages.size);
const limit = createLimiter(3);

await Promise.all([...pages.values()].map((p) => limit(async () => {
  let handle = mostCommon(p.handles);
  const funnel_url = mostCommon(p.links);
  let handle_source = handle ? 'ad' : null;
  if (!handle && funnel_url && !args.noFetch) {
    const page = await fetchHtml(funnel_url);
    handle = findHandleInHtml(page.html);
    if (handle) handle_source = 'funnel_page';
  }
  if (!handle) {
    unresolvedRows.push({ page_id: p.page_id, page_name: p.page_name, source: p.source, source_detail: [...p.terms].join('; '), funnel_url, ads: p.ads, reason: funnel_url ? 'no_instagram_link_in_ads_or_funnel' : 'no_instagram_link_and_no_funnel_url' });
    progress.fail(`${p.page_name} unresolved`);
    return;
  }
  if (existing.has(handle)) { progress.skip(); return; }
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
    date_sourced: TODAY,
  };
  existing.set(handle, row);
  appendNdjson(FILES.resolved, row);
  progress.tick(`@${handle} (${handle_source}) ads=${p.active}/${p.ads} days=${row.ad_days_active}`);
})));
writeNdjson(FILES.unresolved, unresolvedRows);
progress.done();
console.log(`resolved: ${existing.size} handles | unresolved pages: ${unresolvedRows.length} -> ${FILES.unresolved}`);
