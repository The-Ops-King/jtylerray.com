/**
 * Step 6: filter + grade. Deterministic, no LLM.
 * Hard rules (config/criteria.json) reject rows that can never be a fit: not a coach/consultant/course creator, agency,
 * profile missing/private, below the reachability follower floor, ads too new. Every reject carries the rule and value.
 * Rows that pass are graded by config/scoring.json into fit_score / fit_tier / fit_notes and written to
 * data/qualified.ndjson sorted by score, so the CSV can be sliced on any signal. Rows not yet classified are reported
 * as `not_classified_yet`. Rewrites both output files in full on every run.
 * Usage: node src/steps/filter.js
 */
import { ensureDirs, FILES } from '../lib/paths.js';
import { readNdjsonMap, writeNdjson } from '../lib/ndjson.js';
import { loadCriteria, buildPreRules, buildPostRules, evaluate } from '../lib/criteria.js';
import { loadScoring, score } from '../lib/scoring.js';
import { loadJoined } from '../lib/records.js';

ensureDirs();
const C = loadCriteria(); const S = loadScoring();
const pre = buildPreRules(C); const post = buildPostRules(C);
const classified = readNdjsonMap(FILES.classified);
const rows = [...loadJoined(['resolved', 'profiles', 'funnels', 'classified']).values()].filter((r) => r.funnel_fetched_at);
const qualified = []; const rejects = []; const tally = {};
const reject = (r, v) => { rejects.push({ ...r, ...v }); tally[v.rejected_by] = (tally[v.rejected_by] || 0) + 1; };
for (const r of rows) {
  const v1 = evaluate(pre, r);
  if (v1) { reject(r, v1); continue; }
  if (!classified.has(r.ig_handle)) { reject(r, { rejected_by: 'not_classified_yet', reject_detail: 'run classify' }); continue; }
  const v2 = evaluate(post, r);
  if (v2) { reject(r, v2); continue; }
  qualified.push({ ...r, ...score(S, r) });
}
qualified.sort((a, b) => b.fit_score - a.fit_score || (b.follower_count ?? 0) - (a.follower_count ?? 0));
writeNdjson(FILES.qualified, qualified);
writeNdjson(FILES.rejects, rejects);
const tiers = {}; for (const q of qualified) tiers[q.fit_tier] = (tiers[q.fit_tier] || 0) + 1;
console.log(`[filter] ${rows.length} enriched (${classified.size} classified) -> ${qualified.length} qualified, ${rejects.length} rejected`);
console.log(`  tiers: ${Object.entries(tiers).sort().map(([t, n]) => `${t}=${n}`).join(' ')}`);
for (const [rule, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  rejected by ${rule}: ${n}`);
