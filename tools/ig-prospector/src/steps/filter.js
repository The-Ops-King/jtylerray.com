/**
 * Step 6: filter. Deterministic qualification from config/criteria.json. No LLM.
 * Reads every enriched row (funnels.ndjson) and joins the classification where one exists. Pre-classification rules
 * (followers, ad age, post recency, profile found) apply to every row; classification rules apply to classified rows.
 * A row that passes the pre-rules but has no classification yet is reported as `not_classified_yet`.
 * Every reject carries `rejected_by` (the first rule that killed it) and `reject_detail` (the value it saw).
 * Rewrites data/qualified.ndjson and data/rejects.ndjson in full on every run (cheap, and criteria change often).
 * Usage: node src/steps/filter.js
 */
import { ensureDirs, FILES } from '../lib/paths.js';
import { readNdjson, readNdjsonMap, writeNdjson } from '../lib/ndjson.js';
import { loadCriteria, buildPreRules, buildPostRules, evaluate } from '../lib/criteria.js';

ensureDirs();
const C = loadCriteria();
const pre = buildPreRules(C); const post = buildPostRules(C);
const classified = readNdjsonMap(FILES.classified);
const rows = readNdjson(FILES.funnels);
const qualified = []; const rejects = []; const tally = {};
const reject = (r, v) => { rejects.push({ ...r, ...v }); tally[v.rejected_by] = (tally[v.rejected_by] || 0) + 1; };
for (const base of rows) {
  const r = classified.get(base.ig_handle) ?? base;
  const v1 = evaluate(pre, r);
  if (v1) { reject(r, v1); continue; }
  if (!classified.has(base.ig_handle)) { reject(r, { rejected_by: 'not_classified_yet', reject_detail: 'run classify' }); continue; }
  const v2 = evaluate(post, r);
  if (v2) { reject(r, v2); continue; }
  qualified.push(r);
}
writeNdjson(FILES.qualified, qualified);
writeNdjson(FILES.rejects, rejects);
console.log(`[filter] ${rows.length} enriched (${classified.size} classified) -> ${qualified.length} qualified, ${rejects.length} rejected`);
for (const [rule, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  rejected by ${rule}: ${n}`);
