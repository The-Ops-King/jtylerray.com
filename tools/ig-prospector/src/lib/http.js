import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cacheGet, cacheSet } from './cache.js';
import { withBackoff, sleep } from './limiter.js';

const execFileP = promisify(execFile);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Hosts whose pages are link-in-bio hubs: we also fetch their first outbound destination. */
export const LINK_IN_BIO_HOSTS = ['linktr.ee', 'beacons.ai', 'stan.store', 'linkin.bio', 'bio.site', 'tap.bio', 'lnk.bio', 'msha.ke', 'hoo.be', 'snipfeed.co', 'campsite.bio', 'solo.to', 'linkpop.com', 'allmylinks.com', 'bio.link', 'linkme.bio', 'withkoji.com', 'komi.io', 'pillar.io', 'later.com'];
const SOCIAL_HOSTS = ['instagram.com', 'facebook.com', 'fb.com', 'fb.me', 'm.me', 'messenger.com', 'ig.me', 'tiktok.com', 'youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'linkedin.com', 'spotify.com', 'apple.com', 'threads.net', 'snapchat.com', 'pinterest.com', 'whatsapp.com', 'wa.me', 't.me', 'discord.gg', 'discord.com'];

function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
const hostMatches = (host, list) => list.some((h) => host === h || host.endsWith('.' + h));
export const isLinkInBio = (url) => hostMatches(hostOf(url), LINK_IN_BIO_HOSTS);
export const isSocial = (url) => hostMatches(hostOf(url), SOCIAL_HOSTS);

/** Strip Meta click-tracking wrappers (l.facebook.com/l.php?u=...) and common tracking params. */
export function cleanUrl(raw) {
  if (!raw) return null;
  let url = String(raw).trim();
  try {
    let u = new URL(url);
    if (/(^|\.)facebook\.com$/.test(u.hostname) && u.pathname === '/l.php' && u.searchParams.get('u')) u = new URL(u.searchParams.get('u'));
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|ref_|_ga|mc_)/i.test(k)) u.searchParams.delete(k);
    u.hash = '';
    return u.toString();
  } catch { return null; }
}

async function fetchOnce(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' } });
    const location = res.headers.get('location');
    const html = res.status >= 300 && res.status < 400 ? '' : await res.text();
    return { status: res.status, location: location ? new URL(location, url).toString() : null, html, contentType: res.headers.get('content-type') || '' };
  } finally { clearTimeout(t); }
}

/**
 * Fetch a page, following at most `maxRedirects` redirect hops (spec: one). Cached by URL in cache/http.
 * Returns { url, final_url, status, html, redirected, fetched_at, error }.
 */
export async function fetchHtml(url, { maxRedirects = 1, timeoutMs = 20000, force = false } = {}) {
  const key = url;
  if (!force) { const hit = cacheGet('http', key); if (hit) return hit.value; }
  let current = url; let hops = 0; let result;
  try {
    for (;;) {
      const r = await withBackoff(() => fetchOnce(current, timeoutMs), { label: `http ${hostOf(current)}`, retries: 2 });
      if (r.location && hops < maxRedirects) { hops++; current = r.location; continue; }
      result = { url, final_url: current, status: r.status, html: r.html.slice(0, 2_000_000), redirected: hops, pending_redirect: r.location || null, content_type: r.contentType, fetched_at: new Date().toISOString(), error: null };
      break;
    }
  } catch (err) {
    result = { url, final_url: current, status: 0, html: '', redirected: hops, pending_redirect: null, content_type: '', fetched_at: new Date().toISOString(), error: String(err?.message || err) };
  }
  return cacheSet('http', key, result);
}

const WAF_MARK = 'awsWafCookieDomainList';
const isChallenge = (code, html) => Number(code) === 202 && html.includes(WAF_MARK);
/**
 * Same contract as fetchHtml, but the request goes through the system curl. Some hosts (Skool, behind AWS WAF) serve a
 * JavaScript challenge to Node's fetch fingerprint and a normal page to curl (only with a plain browser UA; extra accept
 * headers trigger the challenge too). A challenge page is retried with a pause and never cached. Follows at most one redirect, like fetchHtml.
 */
export async function fetchHtmlCurl(url, { timeoutMs = 20000, force = false, retries = 3 } = {}) {
  if (!force) { const hit = cacheGet('http', url); if (hit) return hit.value; }
  const MARK = '\n<<<CURL-META>>>';
  let result;
  for (let attempt = 0; ; attempt++) {
    try {
      const { stdout } = await execFileP('curl', ['-sS', '-L', '--max-redirs', '1', '--max-time', String(Math.ceil(timeoutMs / 1000)), '--noproxy', '127.0.0.1,localhost', '-A', UA, '-w', `${MARK}%{http_code} %{url_effective} %{num_redirects}`, url], { maxBuffer: 8 * 1024 * 1024 });
      const at = stdout.lastIndexOf(MARK);
      const [code, finalUrl, hops] = stdout.slice(at + MARK.length).trim().split(' ');
      const html = stdout.slice(0, at);
      if (isChallenge(code, html) && attempt < retries) { await sleep(3000 * 2 ** attempt); continue; }
      result = { url, final_url: finalUrl || url, status: Number(code) || 0, html: html.slice(0, 2_000_000), redirected: Number(hops) || 0, pending_redirect: null, content_type: '', fetched_at: new Date().toISOString(), error: isChallenge(code, html) ? 'waf_challenge' : null };
    } catch (err) {
      if (attempt < retries) { await sleep(1000 * 2 ** attempt); continue; }
      result = { url, final_url: url, status: 0, html: '', redirected: 0, pending_redirect: null, content_type: '', fetched_at: new Date().toISOString(), error: String(err?.message || err) };
    }
    break;
  }
  return result.error === 'waf_challenge' ? result : cacheSet('http', url, result);
}

/** Visible text + title + meta description from HTML. Good enough for classification; not a DOM parser. */
export function htmlToText(html, maxChars = 12000) {
  if (!html) return '';
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)?.[1] || '').trim();
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  const head = [title && `TITLE: ${title}`, desc && `DESCRIPTION: ${desc}`].filter(Boolean).join('\n');
  return (head ? head + '\n\n' : '') + text.slice(0, maxChars);
}

/** First outbound, non-social, non-self link on a link-in-bio page. */
export function firstOutboundLink(html, pageUrl) {
  if (!html) return null;
  const host = hostOf(pageUrl);
  const re = /href=["'](https?:\/\/[^"'\s>]+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = cleanUrl(m[1]);
    if (!href) continue;
    const h = hostOf(href);
    if (!h || h === host || hostMatches(h, LINK_IN_BIO_HOSTS) || isSocial(href)) continue;
    if (/\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?)(\?|$)/i.test(href)) continue;
    return href;
  }
  return null;
}
