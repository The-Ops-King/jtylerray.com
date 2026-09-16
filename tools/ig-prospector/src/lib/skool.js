/** Parsers for Skool's server-rendered pages (the __NEXT_DATA__ blob). No network here; the step does the fetching. */
const asObj = (v) => { if (v && typeof v === 'object') return v; if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } } return {}; };
const cents = (v) => { const o = asObj(v); return o.amount != null && o.currency === 'usd' ? Math.round(o.amount) / 100 : null; };

export function parseNextData(html) {
  const m = String(html || '').match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]).props?.pageProps ?? null; } catch { return null; }
}

function groupSummary(g) {
  const md = asObj(g.metadata);
  return {
    name: g.name ?? null,
    display_name: md.displayName ?? g.name ?? null,
    members: Number(md.totalMembers ?? 0) || 0,
    price_monthly_usd: cents(md.currentMBp),
    price_annual_usd: cents(md.currentABp),
    description: md.description ?? null,
  };
}

/** Discovery page -> { groups, num_groups, page, has_more }. Entries are either { group } wrappers or bare groups. */
export function parseDiscovery(html) {
  const pp = parseNextData(html);
  if (!pp || !Array.isArray(pp.groups)) return null;
  const groups = pp.groups.map((e) => groupSummary(e.group ?? e)).filter((g) => g.name);
  return { groups, num_groups: pp.numGroups ?? null, page: pp.page ?? null, has_more: pp.hasMore ?? null };
}

/** Community about page -> group summary + owner (name, links). */
export function parseAbout(html) {
  const pp = parseNextData(html);
  const g = pp?.currentGroup;
  if (!g) return null;
  const md = asObj(g.metadata);
  const o = asObj(md.owner); const om = asObj(o.metadata);
  return {
    ...groupSummary(g),
    lp_description: md.lpDescription ?? null,
    num_courses: md.numCourses ?? null,
    owner: {
      first_name: o.first_name ?? null,
      last_name: o.last_name ?? null,
      username: o.name ?? null,
      bio: om.bio ?? null,
      instagram: om.link_instagram || null,
      website: om.link_website || null,
      youtube: om.link_youtube || null,
      linkedin: om.link_linkedin || null,
      twitter: om.link_twitter || null,
      facebook: om.link_facebook || null,
    },
  };
}
