/**
 * Seed source: Skool community owners. For every niche in config/niches.json, search Skool discovery (server-rendered,
 * fetched through curl because Skool's WAF challenges Node's fetch, cached), open each community's about page, and take the owner's Instagram link when there is one.
 * Every community seen is recorded in data/skool-groups.ndjson (with or without an Instagram link) for later use.
 * Output: data/raw/seeds/skool/<niche>-<hash>.json. Zero spend.
 * Usage: node src/steps/source-skool.js [--force: refetch pages] [--limit N niches] [--niche key]
 */
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, DATA_DIR } from '../lib/paths.js';
import { readNdjsonMap, appendNdjson, compactNdjson } from '../lib/ndjson.js';
import { fetchHtmlCurl as fetchHtml, cleanUrl } from '../lib/http.js';
import { parseDiscovery, parseAbout } from '../lib/skool.js';
import { normalizeHandle, handleFromUrl } from '../lib/handles.js';
import { createLimiter, sleep } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';
import { writeSeedFile } from '../lib/seeds.js';

const args = parseArgs();
ensureDirs();
const cfg = readConfig('skool.json');
const IGNORED = new Set(readConfig('resolve.json').ignored_handles.map((h) => h.toLowerCase()));
let niches = readConfig('niches.json').niches;
if (args.niche) niches = niches.filter((n) => n.key === args.niche);
niches = niches.slice(0, args.limit);
const GROUPS = path.join(DATA_DIR, 'skool-groups.ndjson');
const groupsSeen = readNdjsonMap(GROUPS, 'name');
const base = cfg.base_url.replace(/\/$/, '');
const discoveryUrl = (q, p) => `${base}/discovery?q=${encodeURIComponent(q)}${p > 1 ? `&p=${p}` : ''}`;
const aboutUrl = (name) => `${base}/${name}/about`;
const igHandle = (v) => { if (!v) return null; const h = handleFromUrl(cleanUrl(v) || v) || normalizeHandle(v); return h && !IGNORED.has(h) ? h : null; };
const limit = createLimiter(cfg.concurrency);

for (const niche of niches) {
  // 1) Discovery pages for every query, deduped by community name.
  const found = new Map();
  for (const q of niche.skool_queries) {
    for (let p = 1; p <= cfg.max_pages_per_query; p++) {
      const page = await fetchHtml(discoveryUrl(q, p), { force: args.force });
      const d = parseDiscovery(page.html);
      if (!d) { if (page.error) console.error(`[source:skool] ${discoveryUrl(q, p)} -> ${page.error}`); break; }
      if (!d.groups.length) break;
      for (const g of d.groups) if (!found.has(g.name)) found.set(g.name, { ...g, query: q });
      if (d.has_more === false || d.groups.length < 30) break;
      await sleep(cfg.delay_ms);
    }
  }
  const eligible = [...found.values()].filter((g) => g.members >= cfg.min_members && (!cfg.paid_only || g.price_monthly_usd || g.price_annual_usd));
  const progress = createProgress(`source:skool ${niche.key}`, eligible.length);
  const items = [];
  // 2) About page per community -> owner links.
  await Promise.all(eligible.map((g) => limit(async () => {
    const page = await fetchHtml(aboutUrl(g.name), { force: args.force });
    await sleep(cfg.delay_ms);
    const a = parseAbout(page.html);
    if (!a) { progress.fail(`${g.name} about page unreadable (${page.status})`); return; }
    const handle = igHandle(a.owner.instagram);
    const rec = { name: g.name, niche: niche.key, query: g.query, display_name: a.display_name, members: a.members, price_monthly_usd: a.price_monthly_usd, price_annual_usd: a.price_annual_usd, owner_name: [a.owner.first_name, a.owner.last_name].filter(Boolean).join(' ') || null, owner_username: a.owner.username, ig_handle: handle, website: a.owner.website, youtube: a.owner.youtube, fetched_at: new Date().toISOString() };
    groupsSeen.set(g.name, rec); appendNdjson(GROUPS, rec);
    if (!handle) { progress.skip(); return; }
    items.push({
      ig_handle: handle,
      name: rec.owner_name,
      page_id: `skool:${g.name}`,
      funnel_url: a.owner.website || aboutUrl(g.name),
      extra: { community_name: a.display_name, community_url: aboutUrl(g.name), community_members: a.members, community_price_monthly_usd: a.price_monthly_usd, community_price_annual_usd: a.price_annual_usd, community_owner: rec.owner_name, niche_key: niche.key },
    });
    progress.tick(`${g.name} -> @${handle} (${a.members} members${a.price_monthly_usd ? `, $${a.price_monthly_usd}/mo` : ''})`);
  })));
  progress.done();
  if (items.length) console.log(`[source:skool] ${niche.key}: ${found.size} communities, ${eligible.length} eligible, ${items.length} with Instagram -> ${writeSeedFile('skool', niche.key, `skool:${niche.key}`, items)}`);
  else console.log(`[source:skool] ${niche.key}: ${found.size} communities, ${eligible.length} eligible, none with an Instagram link`);
}
compactNdjson(GROUPS, 'name');
