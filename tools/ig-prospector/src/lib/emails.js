/**
 * Contact email mining. Sources, in trust order: the Instagram bio, `mailto:` links on the funnel / destination page,
 * plain-text addresses in that HTML. Everything is filtered against config/emails.json (platform vendors, template
 * placeholders, asset file names) and, at pick time, against addresses that show up for several unrelated advertisers
 * (a page builder's template address, not the coach's). The pick is deterministic so reruns are idempotent.
 */
import { z } from 'zod';
import { readConfig } from './paths.js';

const EmailsConfigSchema = z.object({
  platform_domains: z.array(z.string()),
  junk_local_parts: z.array(z.string()),
  generic_local_parts: z.array(z.string()),
  shared_handle_threshold: z.number().int().min(2),
}).passthrough();

let cached;
export function loadEmailsConfig() {
  if (!cached) cached = EmailsConfigSchema.parse(readConfig('emails.json'));
  return cached;
}

const EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)+/gi;
const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|avif|css|js|mjs|ico|woff2?|ttf|otf|eot|mp4|webm|pdf|json|xml|map|html?)$/i;
const FREEMAIL = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'me.com', 'aol.com', 'live.com', 'protonmail.com', 'proton.me', 'msn.com', 'ymail.com'];

export function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } }
const domainMatches = (domain, list) => list.some((d) => domain === d || domain.endsWith('.' + d));
const registrable = (host) => host.split('.').slice(-2).join('.');

/** Decode the common ways pages obfuscate or encode an address before scanning. */
function normalizeSource(text) {
  return String(text || '')
    .replace(/&#0*64;|&#x0*40;|%40|\\u0040/gi, '@')
    .replace(/&#0*46;|&#x0*2e;/gi, '.')
    .replace(/\s*\[\s*at\s*\]\s*|\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*|\s*\(\s*dot\s*\)\s*/gi, '.');
}

/** True when the address is a real mailbox and not a vendor, template or asset artefact. */
export function isPlausibleEmail(email, cfg = loadEmailsConfig()) {
  const e = String(email || '').toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1) return false;
  const local = e.slice(0, at); const domain = e.slice(at + 1);
  if (e.length > 254 || local.length > 64) return false;
  if (ASSET_EXT.test(domain) || ASSET_EXT.test(local)) return false; // image@2x.png, sprite@3x
  if (/^\d+x$/.test(local) || /^\d+x\./.test(domain)) return false; // retina suffixes
  if (!/^[a-z]{2,24}$/.test(domain.split('.').pop())) return false;
  if (domain.split('.').some((p) => !p || p.startsWith('-') || p.endsWith('-'))) return false;
  if (domainMatches(domain, cfg.platform_domains)) return false;
  if (cfg.junk_local_parts.includes(local.replace(/[^a-z0-9]/g, '')) || cfg.junk_local_parts.includes(local)) return false;
  if (/^[a-f0-9]{16,}$/.test(local) || /^[a-f0-9]{16,}\./.test(domain)) return false; // hashes
  if (/^(sentry|.*\.ingest)\./.test(domain)) return false;
  return true;
}

/** All plausible addresses in a text/HTML blob, lowercased, deduped, in order of first appearance. */
export function extractEmails(text, cfg = loadEmailsConfig()) {
  const out = []; const seen = new Set();
  for (const m of normalizeSource(text).matchAll(EMAIL_RE)) {
    const e = m[0].toLowerCase().replace(/^[._%+\-]+/, '').replace(/\.+$/, '');
    if (!seen.has(e) && isPlausibleEmail(e, cfg)) { seen.add(e); out.push(e); }
  }
  return out;
}

/**
 * Candidates from one fetched page. `mailto:` links are separated from plain-text hits because they are an explicit
 * contact affordance. `host_match` is whether the address domain is the page's own domain.
 */
export function candidatesFromHtml(html, pageUrl, source, cfg = loadEmailsConfig()) {
  if (!html) return [];
  const host = hostOf(pageUrl); const reg = host ? registrable(host) : '';
  const mailtos = new Set();
  for (const m of normalizeSource(html).matchAll(/mailto:([^"'?&<>\s]+)/gi)) {
    try { for (const e of extractEmails(decodeURIComponent(m[1]), cfg)) mailtos.add(e); } catch { /* bad escape */ }
  }
  const all = extractEmails(html, cfg);
  const seen = new Set(); const out = [];
  for (const email of [...mailtos, ...all]) {
    if (seen.has(email)) continue; seen.add(email);
    const domain = email.slice(email.lastIndexOf('@') + 1);
    out.push({ email, source, mailto: mailtos.has(email), host_match: Boolean(reg) && registrable(domain) === reg });
  }
  return out;
}

export function candidatesFromBio(bio, cfg = loadEmailsConfig()) {
  return extractEmails(bio, cfg).map((email) => ({ email, source: 'bio', mailto: false, host_match: false }));
}

/** Map email -> Set of handles it appears for, across every row. Used to drop template addresses shared by unrelated pages. */
export function countSharedEmails(rows) {
  const counts = new Map();
  for (const r of rows) for (const c of r.email_candidates || []) {
    if (!counts.has(c.email)) counts.set(c.email, new Set());
    counts.get(c.email).add(r.ig_handle);
  }
  return counts;
}

function rank(c, cfg) {
  const local = c.email.slice(0, c.email.indexOf('@')); const domain = c.email.slice(c.email.indexOf('@') + 1);
  let s = 0;
  if (c.source === 'bio') s += 100;
  if (c.host_match) s += 30;
  if (c.mailto) s += 20;
  if (cfg.generic_local_parts.includes(local)) s += 3; else s += 5; // a named mailbox edges out info@ at the same tier
  if (domainMatches(domain, FREEMAIL) && c.source !== 'bio' && !c.mailto) s -= 4; // stray gmail in page text is often a testimonial
  return s;
}

/**
 * Pick one address for a row. Returns { contact_email, contact_email_source } (nulls when nothing survives).
 * `shared` is the map from countSharedEmails; an address seen for >= threshold handles is dropped unless it is on the
 * advertiser's own domain (a brand with several accounts) or in their bio. Stored candidates are re-checked against the
 * current config so a vendor domain added to config/emails.json takes effect without refetching funnels.
 */
export function pickContactEmail(row, shared, cfg = loadEmailsConfig()) {
  const cands = (row.email_candidates || []).filter((c) => isPlausibleEmail(c.email, cfg));
  const ok = cands.filter((c) => c.source === 'bio' || c.host_match || (shared.get(c.email)?.size ?? 1) < cfg.shared_handle_threshold);
  if (!ok.length) return { contact_email: null, contact_email_source: null };
  const best = ok.map((c, i) => ({ c, i, s: rank(c, cfg) })).sort((a, b) => b.s - a.s || a.i - b.i)[0].c;
  const via = best.source === 'bio' ? 'bio' : `${best.source}_${best.mailto ? 'mailto' : 'text'}`;
  return { contact_email: best.email, contact_email_source: via };
}
