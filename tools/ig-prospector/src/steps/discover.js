/**
 * Step 2b: discover. Find Instagram handles for advertisers that resolve could not link (no IG in the ads or on the
 * funnel page). Agent mode only: this step writes data/discover-queue.ndjson + data/discover-instructions.md; a Claude
 * Code session or sub-agents web-search each page and write data/discover-answers.ndjson; rerunning ingests them into
 * data/discovered.ndjson (keyed by page_id, null answers included so nothing is searched twice). resolve reads
 * discovered.ndjson as a handle source. Pages whose ads already fail min_ad_days_active, or whose Facebook page is far
 * too big for the follower band, are not queued (they could never qualify).
 * Usage: node src/steps/discover.js [--limit N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, FILES, DATA_DIR } from '../lib/paths.js';
import { readNdjson, readNdjsonMap, appendNdjson, writeNdjson } from '../lib/ndjson.js';
import { normalizeHandle } from '../lib/handles.js';
import { loadCriteria } from '../lib/criteria.js';

const args = parseArgs();
ensureDirs();
const C = loadCriteria();
const IGNORED = new Set(readConfig('resolve.json').ignored_handles.map((h) => h.toLowerCase()));
const QUEUE = path.join(DATA_DIR, 'discover-queue.ndjson');
const ANSWERS = path.join(DATA_DIR, 'discover-answers.ndjson');
const INSTRUCTIONS = path.join(DATA_DIR, 'discover-instructions.md');
export const DISCOVERED = path.join(DATA_DIR, 'discovered.ndjson');
// A Facebook page with this many likes is not in the 3k-100k Instagram band; skip it before spending search effort.
const MAX_PAGE_LIKES = C.max_followers != null ? C.max_followers * 10 : null;

const discovered = readNdjsonMap(DISCOVERED, 'page_id');
const unresolved = readNdjson(FILES.unresolved);

// 1) Ingest answers.
let ingested = 0, rejected = 0;
for (const a of readNdjson(ANSWERS)) {
  if (!a.page_id || discovered.has(String(a.page_id))) continue;
  const handle = a.ig_handle == null ? null : normalizeHandle(a.ig_handle);
  if (a.ig_handle != null && (!handle || IGNORED.has(handle))) { rejected++; appendNdjson(FILES.classifyFailures.replace('classify-failures', 'discover-failures'), { page_id: a.page_id, error: `invalid handle ${JSON.stringify(a.ig_handle)}`, ts: new Date().toISOString() }); continue; }
  const row = { page_id: String(a.page_id), page_name: a.page_name ?? null, ig_handle: handle, evidence: a.evidence ?? null, confidence: a.confidence ?? null, model: a.model ?? 'agent', discovered_at: new Date().toISOString() };
  discovered.set(row.page_id, row);
  appendNdjson(DISCOVERED, row);
  ingested++;
}

// 2) Queue what is still unknown and could still qualify.
const skipped = {};
const queue = [];
for (const u of unresolved) {
  if (discovered.has(String(u.page_id))) continue;
  if (C.min_ad_days_active != null && (u.ad_days_active == null || u.ad_days_active < C.min_ad_days_active)) { skipped.ad_days = (skipped.ad_days || 0) + 1; continue; }
  if (MAX_PAGE_LIKES != null && u.page_like_count != null && u.page_like_count > MAX_PAGE_LIKES) { skipped.page_too_big = (skipped.page_too_big || 0) + 1; continue; }
  queue.push({ page_id: String(u.page_id), page_name: u.page_name, page_profile_uri: u.page_profile_uri ?? null, page_like_count: u.page_like_count ?? null, funnel_url: u.funnel_url ?? null, ad_text: u.ad_text ?? null, ads: u.ads, ad_days_active: u.ad_days_active ?? null });
}
const limited = queue.slice(0, args.limit);
writeNdjson(QUEUE, limited);
fs.writeFileSync(INSTRUCTIONS, instructions(limited.length));
console.log(`[discover] ingested ${ingested} answer(s), ${rejected} rejected; known pages ${discovered.size} (${[...discovered.values()].filter((d) => d.ig_handle).length} with a handle); skipped ${JSON.stringify(skipped)}; ${limited.length} queued${queue.length > limited.length ? ` of ${queue.length}` : ''}`);
if (limited.length) console.log(`[discover] queue: ${QUEUE}\n[discover] write answers to ${ANSWERS} then rerun this step, then rerun resolve`);

function instructions(n) {
  return `# Handle discovery instructions (generated, ${new Date().toISOString()})

${n} advertiser page(s) are waiting in \`data/discover-queue.ndjson\`. Each line: page_id, page_name (the Facebook page name), page_profile_uri (the Facebook page URL), page_like_count, funnel_url, ad_text (a snippet of their ad copy), ads (how many ads), ad_days_active.

Goal: find the Instagram account that belongs to this same advertiser, or say there is none.

For each line, web-search the page name together with "instagram" (and the person's name or brand from the ad text if that helps). Accept a handle only when the evidence ties it to this advertiser: same person or brand name, same website domain as funnel_url, or the Facebook page links to it. A similarly named account that is someone else is a null. Never guess. Personal accounts of a brand's founder count only when the ads are clearly the founder's personal brand.

Append one line per page to \`data/discover-answers.ndjson\`:

\`\`\`json
{"page_id": "<page_id copied verbatim>", "page_name": "<page_name>", "ig_handle": "<handle without @, or null>", "evidence": "<one sentence: what tied the account to the advertiser, with the URL you saw>", "confidence": "high | medium | low", "model": "<who searched, e.g. claude-subagent>"}
\`\`\`

Write null for ig_handle when you cannot tie an account to the advertiser. A null is a correct and useful answer: it stops the page from being searched again. Then run \`npm run discover\` to ingest, then \`npm run resolve\`.
`;
}
