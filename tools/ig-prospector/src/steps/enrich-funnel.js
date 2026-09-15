/**
 * Step 4: enrich-funnel. Fetch the funnel page HTML (ad destination, else bio link). Raw HTML is cached in cache/http keyed by URL.
 * Follows one redirect hop. Link-in-bio pages (Linktree etc.) also get their first outbound destination fetched.
 * Output: data/funnels.ndjson (profile row + funnel_final_url, funnel_text, funnel_status).
 * Usage: node src/steps/enrich-funnel.js [--force] [--limit N]
 */
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, FILES } from '../lib/paths.js';
import { readNdjson, readNdjsonMap, appendNdjson, removeFromNdjson, pruneOrphans } from '../lib/ndjson.js';
import { fetchHtml, htmlToText, isLinkInBio, firstOutboundLink } from '../lib/http.js';
import { createLimiter } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';

const args = parseArgs();
ensureDirs();
const maxChars = readConfig('classify.json').max_funnel_chars;

const profiles = readNdjson(FILES.profiles);
pruneOrphans(FILES.funnels, new Set(profiles.map((r) => r.ig_handle)));
const done = readNdjsonMap(FILES.funnels);
const pending = profiles.filter((r) => args.force || !done.has(r.ig_handle)).slice(0, args.limit);
if (args.force) removeFromNdjson(FILES.funnels, new Set(pending.map((r) => r.ig_handle)));
const progress = createProgress('enrich-funnel', pending.length);
const limit = createLimiter(3);

await Promise.all(pending.map((r) => limit(async () => {
  const url = r.funnel_url || r.bio_link || null;
  let out = { funnel_url: url, funnel_source: r.funnel_url ? 'ad' : r.bio_link ? 'bio' : null, funnel_final_url: null, funnel_status: null, funnel_text: '', funnel_link_in_bio: false, funnel_destination_url: null };
  if (url) {
    const page = await fetchHtml(url, { force: args.force });
    out.funnel_final_url = page.final_url; out.funnel_status = page.status; out.funnel_error = page.error;
    let text = htmlToText(page.html, maxChars);
    if (isLinkInBio(page.final_url) || isLinkInBio(url)) {
      out.funnel_link_in_bio = true;
      const dest = firstOutboundLink(page.html, page.final_url);
      if (dest) {
        out.funnel_destination_url = dest;
        const d = await fetchHtml(dest, { force: args.force });
        out.funnel_destination_status = d.status;
        text = `[LINK-IN-BIO PAGE ${page.final_url}]\n${text.slice(0, Math.floor(maxChars / 3))}\n\n[DESTINATION ${d.final_url}]\n${htmlToText(d.html, maxChars)}`;
      }
    }
    out.funnel_text = text.slice(0, maxChars);
  }
  const row = { ...r, ...out, funnel_fetched_at: new Date().toISOString() };
  done.set(r.ig_handle, row);
  appendNdjson(FILES.funnels, row);
  progress.tick(`@${r.ig_handle} ${url ? `${out.funnel_status} ${out.funnel_text.length} chars${out.funnel_link_in_bio ? ' (link-in-bio)' : ''}` : 'no url'}`);
})));
progress.done();
