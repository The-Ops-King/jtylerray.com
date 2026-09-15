const HANDLE_RE = /^[a-z0-9._]{1,30}$/;
const IG_URL_RE = /instagram\.com\/([A-Za-z0-9._]{1,30})(?:[/?#]|$)/i;
const IG_RESERVED = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'direct', 'tv', 'ar', 'about', 'legal', 'developer', 'privacy', 'terms']);

/**
 * Normalize anything that looks like an IG handle (raw, @handle, profile URL) to lowercase without the @.
 * This is the primary key for the whole pipeline. Returns null if it cannot be a valid handle.
 */
export function normalizeHandle(input) {
  if (input == null) return null;
  let s = String(input).trim();
  if (!s) return null;
  const m = s.match(IG_URL_RE);
  if (m) s = m[1];
  s = s.replace(/^@+/, '').toLowerCase().replace(/\/+$/, '');
  if (!HANDLE_RE.test(s) || IG_RESERVED.has(s)) return null;
  return s;
}

export function handleFromUrl(url) {
  if (!url) return null;
  const m = String(url).match(IG_URL_RE);
  return m ? normalizeHandle(m[1]) : null;
}

/** Find the first instagram profile link in an HTML/text blob, skipping handles in `ignored` (platform accounts). */
export function findHandleInHtml(html, ignored = new Set()) {
  if (!html) return null;
  const re = /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})(?:[/?#"'\s]|$)/gi;
  let m;
  while ((m = re.exec(html))) {
    const h = normalizeHandle(m[1]);
    if (h && !ignored.has(h)) return h;
  }
  return null;
}

export const igUrl = (handle) => `https://www.instagram.com/${handle}/`;
