/** The first 18 columns are the original contract. The rest are grading and slicing columns appended after it. */
export const CONTRACT_COLUMNS = ['first_name', 'last_name', 'email', 'phone', 'ig_handle', 'ig_url', 'follower_count', 'offer_price', 'funnel_url', 'funnel_type', 'ads_running', 'ad_days_active', 'niche', 'team_signal', 'source', 'source_detail', 'date_sourced', 'notes'];
export const EXTRA_COLUMNS = ['contact_email', 'contact_email_source', 'fit_tier', 'fit_score', 'fit_notes', 'business_type', 'confidence', 'days_since_last_post', 'last_post_at', 'post_count', 'bio_link', 'fb_page_name', 'community_url', 'community_members', 'community_price_monthly'];
export const CSV_COLUMNS = [...CONTRACT_COLUMNS, ...EXTRA_COLUMNS];

/**
 * The `email` column is a PLACEHOLDER: `{ig_handle}@ig.placeholder`. It exists only so GHL can create and dedupe the contact.
 * The domain is invalid by design. Never wire an email send, workflow, or campaign to it. A real public address, when one
 * was found in the bio or funnel HTML, is in `contact_email` (with `contact_email_source` saying where it came from).
 */
export const placeholderEmail = (handle, domain) => `${handle}@${domain}`;

export function buildNotes(r) {
  return [
    `confidence=${r.classification_confidence}`,
    r.full_name ? `ig_name=${r.full_name}` : null,
    r.funnel_link_in_bio ? `link_in_bio -> ${r.funnel_destination_url || 'no destination'}` : null,
    r.funnel_final_url && r.funnel_final_url !== r.funnel_url ? `funnel_final=${r.funnel_final_url}` : null,
    r.last_post_at ? `last_post=${r.last_post_at}` : null,
    r.post_count != null ? `posts=${r.post_count}` : null,
    r.bio_link ? `bio_link=${r.bio_link}` : null,
    r.page_name && r.source === 'adlibrary' ? `fb_page=${r.page_name}` : null,
    r.community_name ? `community=${r.community_name} (${r.community_members ?? '?'} members${r.community_price_monthly_usd ? `, $${r.community_price_monthly_usd}/mo` : ''})` : null,
    r.related_to ? `related_to=@${r.related_to}` : null,
    r.search_query ? `search=${r.search_query}` : null,
  ].filter(Boolean).join(' | ');
}

export function toRecord(r, placeholderDomain) {
  return {
    first_name: r.first_name ?? '',
    last_name: r.last_name ?? '',
    email: placeholderEmail(r.ig_handle, placeholderDomain),
    phone: '',
    ig_handle: r.ig_handle,
    ig_url: r.ig_url,
    follower_count: r.follower_count ?? '',
    offer_price: r.offer_price ?? '',
    funnel_url: r.funnel_final_url || r.funnel_url || '',
    funnel_type: r.funnel_type ?? '',
    ads_running: r.ads_running ?? '',
    ad_days_active: r.ad_days_active ?? '',
    niche: r.niche ?? '',
    team_signal: r.team_signal ?? '',
    source: r.source ?? '',
    source_detail: r.source_detail ?? '',
    date_sourced: r.date_sourced ?? '',
    notes: buildNotes(r),
    contact_email: r.contact_email ?? '',
    contact_email_source: r.contact_email_source ?? '',
    fit_tier: r.fit_tier ?? '',
    fit_score: r.fit_score ?? '',
    fit_notes: r.fit_notes ?? '',
    business_type: r.business_type ?? '',
    confidence: r.classification_confidence ?? '',
    days_since_last_post: r.days_since_last_post ?? '',
    last_post_at: r.last_post_at ?? '',
    post_count: r.post_count ?? '',
    bio_link: r.bio_link ?? '',
    fb_page_name: r.source === 'adlibrary' ? r.page_name ?? '' : '',
    community_url: r.community_url ?? '',
    community_members: r.community_members ?? '',
    community_price_monthly: r.community_price_monthly_usd ?? '',
  };
}

const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(records) {
  return [CSV_COLUMNS.join(','), ...records.map((rec) => CSV_COLUMNS.map((c) => csvCell(rec[c])).join(','))].join('\n') + '\n';
}

/**
 * Extra tags for the config/ghl.json segments a record matches. GHL has no API for saved smart lists, so a segment is
 * a tag: one filter in the UI turns it into a smart list, and workflows can use it directly. Every clause a segment
 * declares must hold; an absent clause is not a constraint. Missing numbers read as 0, so a blank follower count can
 * never satisfy a minimum.
 */
export function segmentTags(rec, segments = [], prefix = 'ig') {
  const out = [];
  for (const seg of segments) {
    const followers = Number(rec.follower_count) || 0;
    if (seg.funnel_type_in && !seg.funnel_type_in.includes(rec.funnel_type)) continue;
    if (seg.min_followers != null && followers < seg.min_followers) continue;
    if (seg.max_followers != null && followers > seg.max_followers) continue;
    if (seg.has_contact_email && !rec.contact_email) continue;
    out.push(`${prefix}-${tagSafe(seg.tag)}`);
  }
  return out;
}

export const tagSafe = (s) => String(s || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
