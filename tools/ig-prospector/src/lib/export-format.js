export const CSV_COLUMNS = ['first_name', 'last_name', 'email', 'phone', 'ig_handle', 'ig_url', 'follower_count', 'offer_price', 'funnel_url', 'funnel_type', 'ads_running', 'ad_days_active', 'niche', 'team_signal', 'source', 'source_detail', 'date_sourced', 'notes'];

/**
 * The email is a PLACEHOLDER: `{ig_handle}@ig.placeholder`. It exists only so GHL can create and dedupe the contact.
 * The domain is invalid by design. Never wire an email send, workflow, or campaign to these records.
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
    r.page_name ? `fb_page=${r.page_name}` : null,
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
  };
}

const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(records) {
  return [CSV_COLUMNS.join(','), ...records.map((rec) => CSV_COLUMNS.map((c) => csvCell(rec[c])).join(','))].join('\n') + '\n';
}

export const tagSafe = (s) => String(s || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
