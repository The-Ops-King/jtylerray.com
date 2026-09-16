/**
 * Seed source: Instagram "related profiles" of every qualified handle, read from the profile cache (free).
 * The profile scraper returns relatedProfiles only sometimes and never on demand, so this is a one-time bump per run
 * of enrich-profile, not a lookalike engine. Output: data/raw/seeds/ig_related/related-<hash>.json.
 * Usage: node src/steps/source-related.js
 */
import { ensureDirs, FILES } from '../lib/paths.js';
import { readNdjson, readNdjsonMap } from '../lib/ndjson.js';
import { cacheGet } from '../lib/cache.js';
import { normalizeHandle } from '../lib/handles.js';
import { writeSeedFile, knownHandles } from '../lib/seeds.js';

ensureDirs();
const qualified = readNdjson(FILES.qualified);
const known = knownHandles(readNdjsonMap(FILES.resolved));
const seen = new Set(); const items = []; let seeds = 0;
for (const q of qualified) {
  const rp = cacheGet('apify-ig', q.ig_handle)?.value?.item?.relatedProfiles;
  if (!Array.isArray(rp) || !rp.length) continue;
  seeds++;
  for (const p of rp) {
    const h = normalizeHandle(p.username);
    if (!h || known.has(h) || seen.has(h)) continue;
    seen.add(h);
    items.push({ ig_handle: h, name: p.full_name ?? p.fullName ?? null, extra: { related_to: q.ig_handle, related_is_verified: Boolean(p.is_verified) } });
  }
}
if (!items.length) { console.log(`[source:related] ${seeds} qualified handles had related profiles; nothing new to add`); process.exit(0); }
const file = writeSeedFile('ig_related', 'related', 'related_profiles', items);
console.log(`[source:related] ${items.length} new handles from ${seeds} qualified seeds -> ${file}`);
