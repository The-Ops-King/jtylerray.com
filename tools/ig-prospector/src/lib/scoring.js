import { z } from 'zod';
import { readConfig } from './paths.js';

const pts = z.object({ points: z.number() });
export const ScoringSchema = z.object({
  tiers: z.record(z.string(), z.number()),
  signals: z.object({
    followers_in_band: pts.extend({ min: z.number(), max: z.number() }),
    followers_over: pts.extend({ min: z.number() }),
    ad_days_active: pts.extend({ min: z.number() }),
    ads_running: pts.extend({ min: z.number() }),
    funnel_type: z.record(z.string(), z.number()),
    team_signal: z.record(z.string(), z.number()),
    recent_post_days: pts.extend({ max: z.number() }),
    confidence: z.record(z.string(), z.number()),
    niche: z.record(z.string(), z.number()),
    business_type: z.record(z.string(), z.number()),
  }),
}).strict();

export function loadScoring() {
  const raw = readConfig('scoring.json');
  delete raw._comment;
  return ScoringSchema.parse(raw);
}

/** Returns { fit_score, fit_tier, fit_notes } for a fully joined, classified row. Deterministic; no LLM. */
export function score(S, r) {
  const g = S.signals; const hits = []; let total = 0;
  const add = (label, p) => { if (p) { hits.push(label); total += p; } };
  const f = r.follower_count ?? 0;
  if (f >= g.followers_in_band.min && f <= g.followers_in_band.max) add('followers_in_band', g.followers_in_band.points);
  else if (f >= g.followers_over.min) add('followers_over_' + g.followers_over.min, g.followers_over.points);
  if ((r.ad_days_active ?? 0) >= g.ad_days_active.min) add(`ad_days_${g.ad_days_active.min}+`, g.ad_days_active.points);
  if ((r.ads_running ?? 0) >= g.ads_running.min) add(`ads_${g.ads_running.min}+`, g.ads_running.points);
  add(`funnel:${r.funnel_type}`, g.funnel_type[r.funnel_type] || 0);
  add(`team:${r.team_signal}`, g.team_signal[r.team_signal] || 0);
  if (r.days_since_last_post != null && r.days_since_last_post <= g.recent_post_days.max) add('recent_post', g.recent_post_days.points);
  add(`confidence:${r.classification_confidence}`, g.confidence[r.classification_confidence] || 0);
  add(`niche:${r.niche}`, g.niche[r.niche] || 0);
  add(`type:${r.business_type}`, g.business_type[r.business_type] || 0);
  const tier = Object.entries(S.tiers).sort((a, b) => b[1] - a[1]).find(([, min]) => total >= min)?.[0] ?? 'D';
  return { fit_score: total, fit_tier: tier, fit_notes: hits.join(', ') };
}
