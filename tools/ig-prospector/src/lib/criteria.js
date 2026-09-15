import { z } from 'zod';
import { readConfig } from './paths.js';

export const CriteriaSchema = z.object({
  min_followers: z.number().nullable(),
  max_followers: z.number().nullable(),
  min_offer_price_usd: z.number().nullable(),
  require_known_price: z.boolean().default(false),
  allowed_funnel_types: z.array(z.enum(['booking', 'application', 'webinar', 'checkout', 'none'])).nullable(),
  min_ad_days_active: z.number().nullable(),
  max_days_since_last_post: z.number().nullable(),
  exclude_if_agency: z.boolean(),
  exclude_if_sells_to_beginner_coaches: z.boolean(),
  allowed_confidence: z.array(z.enum(['high', 'medium', 'low'])).nullable().default(null),
  allowed_niches: z.array(z.string()).nullable().default(null),
}).strict();

export function loadCriteria() {
  const raw = readConfig('criteria.json');
  delete raw._comment;
  return CriteriaSchema.parse(raw);
}

/**
 * Rules in evaluation order. Each returns null (pass) or a detail string (fail). The first failure is the one reported.
 * A null criterion disables its rule. min_ad_days_active only applies to Ad Library rows (manual imports carry no ad data).
 */
export function buildRules(C) {
  return [
    ['profile_not_found', (r) => (r.profile_found === false ? `profile_error=${r.profile_error || 'not_returned'}` : null)],
    ['profile_private', (r) => (r.is_private ? 'private account' : null)],
    ['min_followers', (r) => (C.min_followers != null && r.follower_count < C.min_followers ? `follower_count=${r.follower_count}` : null)],
    ['max_followers', (r) => (C.max_followers != null && r.follower_count > C.max_followers ? `follower_count=${r.follower_count}` : null)],
    ['max_days_since_last_post', (r) => (C.max_days_since_last_post != null && (r.days_since_last_post == null || r.days_since_last_post > C.max_days_since_last_post) ? `days_since_last_post=${r.days_since_last_post}` : null)],
    ['min_ad_days_active', (r) => (C.min_ad_days_active != null && r.source === 'adlibrary' && (r.ad_days_active == null || r.ad_days_active < C.min_ad_days_active) ? `ad_days_active=${r.ad_days_active}` : null)],
    ['exclude_if_agency', (r) => (C.exclude_if_agency && r.is_agency ? 'is_agency=true' : null)],
    ['exclude_if_sells_to_beginner_coaches', (r) => (C.exclude_if_sells_to_beginner_coaches && r.sells_to_beginner_coaches ? 'sells_to_beginner_coaches=true' : null)],
    ['allowed_funnel_types', (r) => (C.allowed_funnel_types && !C.allowed_funnel_types.includes(r.funnel_type) ? `funnel_type=${r.funnel_type}` : null)],
    ['allowed_niches', (r) => (C.allowed_niches && !C.allowed_niches.includes(r.niche) ? `niche=${r.niche}` : null)],
    ['require_known_price', (r) => (C.require_known_price && r.offer_price == null ? 'offer_price=null' : null)],
    ['min_offer_price_usd', (r) => (C.min_offer_price_usd != null && r.offer_price != null && r.offer_price < C.min_offer_price_usd ? `offer_price=${r.offer_price}` : null)],
    ['allowed_confidence', (r) => (C.allowed_confidence && !C.allowed_confidence.includes(r.classification_confidence) ? `confidence=${r.classification_confidence}` : null)],
  ];
}

export function evaluate(rules, row) {
  for (const [name, fn] of rules) { const detail = fn(row); if (detail) return { rejected_by: name, reject_detail: detail }; }
  return null;
}
