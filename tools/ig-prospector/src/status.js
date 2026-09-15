/** Print row counts per stage file and total spend, so you can see where the funnel is leaking. */
import fs from 'node:fs';
import path from 'node:path';
import { FILES, RAW_DIR } from './lib/paths.js';
import { readNdjson } from './lib/ndjson.js';

const adlib = path.join(RAW_DIR, 'adlib');
let ads = 0, terms = 0;
if (fs.existsSync(adlib)) for (const f of fs.readdirSync(adlib)) { terms++; ads += (JSON.parse(fs.readFileSync(path.join(adlib, f), 'utf8')).items || []).length; }
console.log(`source:          ${terms} terms, ${ads} raw ads`);
for (const [k, label] of [['resolved', 'resolve'], ['unresolved', '  unresolved'], ['profiles', 'enrich-profile'], ['funnels', 'enrich-funnel'], ['classified', 'classify'], ['classifyFailures', '  failures'], ['qualified', 'qualified'], ['rejects', 'rejects'], ['ghlSync', 'ghl synced']]) {
  console.log(`${label.padEnd(16)} ${readNdjson(FILES[k]).length}`);
}
const costs = readNdjson(FILES.costs);
const byProvider = {};
for (const c of costs) byProvider[c.provider] = (byProvider[c.provider] || 0) + (c.usd || 0);
console.log(`spend:           ${Object.entries(byProvider).map(([p, v]) => `${p} $${v.toFixed(4)}`).join(', ') || '$0'}`);
