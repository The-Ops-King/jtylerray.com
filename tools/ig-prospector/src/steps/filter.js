/**
 * Step 6: filter. Deterministic qualification from config/criteria.json. No LLM.
 * Every reject carries `rejected_by` (the first rule that killed it) and `reject_detail` (the value it saw).
 * Rewrites data/qualified.ndjson and data/rejects.ndjson in full on every run (cheap, and criteria change often).
 * Usage: node src/steps/filter.js
 */
import { ensureDirs, FILES } from '../lib/paths.js';
import { readNdjson, writeNdjson } from '../lib/ndjson.js';
import { loadCriteria, buildRules, evaluate } from '../lib/criteria.js';

ensureDirs();
const rules = buildRules(loadCriteria());
const rows = readNdjson(FILES.classified);
const qualified = []; const rejects = []; const tally = {};
for (const r of rows) {
  const verdict = evaluate(rules, r);
  if (verdict) { rejects.push({ ...r, ...verdict }); tally[verdict.rejected_by] = (tally[verdict.rejected_by] || 0) + 1; }
  else qualified.push(r);
}
writeNdjson(FILES.qualified, qualified);
writeNdjson(FILES.rejects, rejects);
console.log(`[filter] ${rows.length} classified -> ${qualified.length} qualified, ${rejects.length} rejected`);
for (const [rule, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  rejected by ${rule}: ${n}`);
