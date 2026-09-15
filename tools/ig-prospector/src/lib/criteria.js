import { z } from 'zod';
import { readConfig } from './paths.js';

const BUSINESS_TYPES = ['coach', 'consultant', 'course_creator', 'agency_or_done_for_you', 'software', 'local_business', 'ecommerce_or_product', 'institution', 'other'];

/** HARD rules. A row failing one is never exported. Grading lives in scoring.js. */
export const CriteriaSchema = z.object({
  allowed_business_types: z.array(z.enum(BUSINESS_TYPES)).nullable(),
  exclude_if_agency: z.boolean(),
  min_followers: z.number().nullable(),
  max_followers: z.number().nullable(),
  min_ad_days_active: z.number().nullable(),
  exclude_private_profiles: z.boolean().default(true),
}).strict();

export function loadCriteria() {
  const raw = readConfig('criteria.json');
  delete raw._comment;
  return CriteriaSchema.parse(raw);
}

/** Rules that need only resolve + profile data. Applied before classify (so hopeless rows are never classified) and in filter. */
export function buildPreRules(C) {
  return [
    ['profile_not_found', (r) => (r.profile_found !== true ? `profile_error=${r.profile_found === false ? (r.profile_error || 'not_returned') : 'not_enriched_yet'}` : null)],
    ['profile_private', (r) => (C.exclude_private_profiles && r.is_private ? 'private account' : null)],
    ['min_followers', (r) => (C.min_followers != null && r.follower_count < C.min_followers ? `follower_count=${r.follower_count}` : null)],
    ['max_followers', (r) => (C.max_followers != null && r.follower_count > C.max_followers ? `follower_count=${r.follower_count}` : null)],
    ['min_ad_days_active', (r) => (C.min_ad_days_active != null && r.source === 'adlibrary' && (r.ad_days_active == null || r.ad_days_active < C.min_ad_days_active) ? `ad_days_active=${r.ad_days_active}` : null)],
  ];
}

/** Rules that need the classification. */
export function buildPostRules(C) {
  return [
    ['not_a_coach', (r) => (C.allowed_business_types && !C.allowed_business_types.includes(r.business_type) ? `business_type=${r.business_type}` : null)],
    ['exclude_if_agency', (r) => (C.exclude_if_agency && r.is_agency ? 'is_agency=true' : null)],
  ];
}

export const buildRules = (C) => [...buildPreRules(C), ...buildPostRules(C)];

export function evaluate(rules, row) {
  for (const [name, fn] of rules) { const detail = fn(row); if (detail) return { rejected_by: name, reject_detail: detail }; }
  return null;
}
