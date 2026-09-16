import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeHandle, handleFromUrl, findHandleInHtml } from '../src/lib/handles.js';
import { cleanUrl, htmlToText, firstOutboundLink, isLinkInBio } from '../src/lib/http.js';
import { pick, fillTemplate } from '../src/lib/fields.js';
import { toEpochMs, daysBetween } from '../src/lib/time.js';
import { buildRules, evaluate, CriteriaSchema } from '../src/lib/criteria.js';
import { toRecord, toCsv, CSV_COLUMNS } from '../src/lib/export-format.js';
import { appendNdjson, readNdjson, readNdjsonMap, writeNdjson } from '../src/lib/ndjson.js';
import { parseArgs } from '../src/lib/cli.js';
import { ClassificationSchema } from '../src/lib/anthropic.js';
import { extractEmails, candidatesFromHtml, candidatesFromBio, countSharedEmails, pickContactEmail } from '../src/lib/emails.js';
import { parseDiscovery, parseAbout } from '../src/lib/skool.js';
import { score } from '../src/lib/scoring.js';

test('handles normalize to lowercase without @ and reject junk', () => {
  assert.equal(normalizeHandle('@Coach.Alice'), 'coach.alice');
  assert.equal(normalizeHandle('https://www.instagram.com/Coach_Bob/?hl=en'), 'coach_bob');
  assert.equal(normalizeHandle('instagram.com/p/abc'), null);
  assert.equal(normalizeHandle('has space'), null);
  assert.equal(normalizeHandle(''), null);
  assert.equal(handleFromUrl('https://l.facebook.com/l.php?u=https://instagram.com/carol.coach'), 'carol.coach');
  assert.equal(findHandleInHtml('<a href="https://www.instagram.com/reel/x">r</a><a href="https://instagram.com/Real_One/">x</a>'), 'real_one');
});

test('cleanUrl unwraps facebook l.php and strips tracking params', () => {
  assert.equal(cleanUrl('https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fapply%3Futm_source%3Dfb%26x%3D1&h=abc'), 'https://example.com/apply?x=1');
  assert.equal(cleanUrl('not a url'), null);
});

test('htmlToText strips scripts and keeps title/description', () => {
  const t = htmlToText('<html><head><title>Apply</title><meta name="description" content="Book a call"></head><body><script>var x=1</script><h1>Hi &amp; bye</h1><p>$5,000 program</p></body></html>');
  assert.match(t, /^TITLE: Apply\nDESCRIPTION: Book a call/);
  assert.match(t, /Hi & bye/);
  assert.doesNotMatch(t, /var x/);
});

test('link-in-bio detection and first outbound link', () => {
  assert.equal(isLinkInBio('https://linktr.ee/coach'), true);
  assert.equal(isLinkInBio('https://example.com'), false);
  const html = '<a href="https://linktr.ee/x">self</a><a href="https://instagram.com/x">ig</a><a href="https://cdn.x/a.png">img</a><a href="https://coach.com/apply?fbclid=1">apply</a>';
  assert.equal(firstOutboundLink(html, 'https://linktr.ee/coach'), 'https://coach.com/apply');
});

test('pick tries paths in order and fillTemplate keeps raw values', () => {
  assert.equal(pick({ snapshot: { cards: [{ link_url: 'x' }] } }, ['link_url', 'snapshot.cards.0.link_url']), 'x');
  assert.equal(pick({ a: '' }, ['a']), null);
  assert.deepEqual(fillTemplate({ usernames: '{{usernames}}', n: '{{n}}', s: 'q={{q}}' }, { usernames: ['a'], n: 5, q: 'z' }), { usernames: ['a'], n: 5, s: 'q=z' });
});

test('time parsing accepts seconds, ms, ISO', () => {
  assert.equal(toEpochMs(1700000000), 1700000000000);
  assert.equal(toEpochMs('1700000000'), 1700000000000);
  assert.equal(toEpochMs('2026-01-01'), Date.parse('2026-01-01'));
  assert.equal(daysBetween(Date.now() - 10 * 86400000), 10);
  assert.equal(daysBetween(null), null);
});

test('hard criteria reject, scoring grades', async () => {
  const C = CriteriaSchema.parse({ allowed_business_types: ['coach', 'consultant', 'course_creator'], exclude_if_agency: true, min_followers: 500, max_followers: null, min_ad_days_active: 7 });
  const rules = buildRules(C);
  const good = { profile_found: true, follower_count: 10000, days_since_last_post: 3, source: 'adlibrary', ad_days_active: 90, ads_running: 4, is_agency: false, business_type: 'coach', funnel_type: 'booking', team_signal: 'has_setter', niche: 'business', classification_confidence: 'high' };
  assert.equal(evaluate(rules, good), null);
  assert.deepEqual(evaluate(rules, { ...good, follower_count: 100 }), { rejected_by: 'min_followers', reject_detail: 'follower_count=100' });
  assert.deepEqual(evaluate(rules, { ...good, profile_found: false }), { rejected_by: 'profile_not_found', reject_detail: 'profile_error=not_returned' });
  assert.deepEqual(evaluate(rules, { ...good, business_type: 'local_business' }), { rejected_by: 'not_a_coach', reject_detail: 'business_type=local_business' });
  assert.deepEqual(evaluate(rules, { ...good, is_agency: true }), { rejected_by: 'exclude_if_agency', reject_detail: 'is_agency=true' });
  assert.equal(evaluate(rules, { ...good, source: 'manual', ad_days_active: null }), null, 'manual rows skip the ad-days rule');
  assert.equal(evaluate(buildRules({ ...C, min_followers: null }), { ...good, follower_count: 1 }), null, 'null disables a rule');
  assert.throws(() => CriteriaSchema.parse({ ...C, bogus: 1 }), /unrecognized/i);
  const { ScoringSchema, score } = await import('../src/lib/scoring.js');
  const S = ScoringSchema.parse(JSON.parse(fs.readFileSync(new URL('../config/scoring.json', import.meta.url), 'utf8').replace(/"_comment":[^\n]*\n/, '')));
  const g = score(S, good);
  assert.equal(g.fit_score, 2 + 2 + 1 + 2 + 2 + 1 + 1 + 1 + 1, 'every signal fires');
  assert.equal(g.fit_tier, 'A');
  assert.match(g.fit_notes, /followers_in_band, ad_days_30\+, ads_3\+, funnel:booking, team:has_setter, recent_post/);
  const weak = score(S, { ...good, follower_count: 700, ad_days_active: 10, ads_running: 1, funnel_type: 'none', team_signal: 'unknown', days_since_last_post: 90, classification_confidence: 'low', niche: 'other', business_type: 'consultant' });
  assert.equal(weak.fit_score, 0); assert.equal(weak.fit_tier, 'D');
});

test('csv export matches the column contract and escapes', () => {
  const rec = toRecord({ ig_handle: 'a.b', ig_url: 'https://www.instagram.com/a.b/', first_name: 'A', last_name: 'B, Jr', follower_count: 5, classification_confidence: 'high', funnel_url: 'https://x.y', source: 'adlibrary', source_detail: 't', date_sourced: '2026-09-15' }, 'ig.placeholder');
  assert.equal(rec.email, 'a.b@ig.placeholder');
  const csv = toCsv([rec]);
  const [header, row] = csv.trim().split('\n');
  assert.equal(header, CSV_COLUMNS.join(','));
  assert.match(header, /^first_name,last_name,email,phone,ig_handle,ig_url,follower_count,offer_price,funnel_url,funnel_type,ads_running,ad_days_active,niche,team_signal,source,source_detail,date_sourced,notes,contact_email,contact_email_source,fit_tier,fit_score,fit_notes,business_type,/);
  assert.match(row, /^A,"B, Jr",a\.b@ig\.placeholder,,a\.b,/);
});

test('ndjson append/read/map survives a torn trailing line', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ndjson-'));
  const f = path.join(dir, 'x.ndjson');
  appendNdjson(f, { ig_handle: 'a', v: 1 });
  appendNdjson(f, { ig_handle: 'a', v: 2 });
  fs.appendFileSync(f, '{"ig_handle":"b","v":');
  assert.equal(readNdjson(f).length, 2);
  assert.equal(readNdjsonMap(f).get('a').v, 2, 'later row wins');
  appendNdjson(f, { ig_handle: 'c' });
  assert.equal(readNdjson(f).length, 3, 'append after a torn line starts a fresh line');
  writeNdjson(f, [{ ig_handle: 'z', t: 'a\u2028b\u2029c' }]);
  assert.equal(fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).length, 1, 'U+2028/2029 are escaped, one record per line');
  assert.deepEqual(readNdjson(f), [{ ig_handle: 'z', t: 'a\u2028b\u2029c' }]);
});

test('cli flags', () => {
  assert.deepEqual(parseArgs(['--force', '--limit', '20', '--no-fetch', '--ghl']), { force: true, limit: 20, positional: [], noFetch: true, ghl: true });
  assert.throws(() => parseArgs(['--limit', 'x']));
});

test('classification schema is strict', () => {
  const ok = { owner_first_name: null, owner_last_name: null, business_type: 'coach', niche: 'business', funnel_type: 'booking', offer_price_usd: null, sells_to_coaches_about_getting_first_client: false, is_agency_or_systems_provider: false, team_signal: 'unknown', confidence: 'low' };
  assert.equal(ClassificationSchema.safeParse(ok).success, true);
  assert.equal(ClassificationSchema.safeParse({ ...ok, niche: 'crypto' }).success, false);
  assert.equal(ClassificationSchema.safeParse({ ...ok, extra: 1 }).success, false);
});

test('email extraction drops vendor, template and asset addresses and decodes obfuscation', () => {
  const html = '<a href="mailto:Hello@CoachJane.com?subject=hi">mail</a> jane&#64;coachjane.com support@skool.com test@gmail.com '
    + 'img@2x.png no-reply@coachjane.com sentry@o123.ingest.sentry.io team [at] otherbrand [dot] com hi@example.com';
  assert.deepEqual(extractEmails(html), ['hello@coachjane.com', 'jane@coachjane.com', 'team@otherbrand.com']);
  const c = candidatesFromHtml(html, 'https://www.coachjane.com/apply', 'funnel');
  assert.deepEqual(c.map((x) => [x.email, x.mailto, x.host_match]), [['hello@coachjane.com', true, true], ['jane@coachjane.com', false, true], ['team@otherbrand.com', false, false]]);
  assert.deepEqual(candidatesFromBio('DM me or email coach@gmail.com'), [{ email: 'coach@gmail.com', source: 'bio', mailto: false, host_match: false }]);
  assert.deepEqual(candidatesFromHtml('', 'https://x.com', 'funnel'), []);
});

test('contact email pick prefers bio, then own-domain mailto, and drops addresses shared across advertisers', () => {
  const tmpl = { email: 'chenowith52@gmail.com', source: 'funnel', mailto: false, host_match: false };
  const rows = [
    { ig_handle: 'a', email_candidates: [tmpl, { email: 'info@a.com', source: 'funnel', mailto: true, host_match: true }, { email: 'me@gmail.com', source: 'bio', mailto: false, host_match: false }] },
    { ig_handle: 'b', email_candidates: [tmpl, { email: 'support@b.com', source: 'destination', mailto: false, host_match: true }, { email: 'sara@b.com', source: 'destination', mailto: false, host_match: true }] },
    { ig_handle: 'c', email_candidates: [tmpl] },
    { ig_handle: 'd', email_candidates: [{ email: 'stray@gmail.com', source: 'funnel', mailto: false, host_match: false }] },
    { ig_handle: 'e', email_candidates: [] },
  ];
  const shared = countSharedEmails(rows);
  assert.equal(shared.get('chenowith52@gmail.com').size, 3);
  assert.deepEqual(pickContactEmail(rows[0], shared), { contact_email: 'me@gmail.com', contact_email_source: 'bio' });
  assert.deepEqual(pickContactEmail(rows[1], shared), { contact_email: 'sara@b.com', contact_email_source: 'destination_text' }, 'named mailbox beats support@ on the same domain');
  assert.deepEqual(pickContactEmail(rows[2], shared), { contact_email: null, contact_email_source: null }, 'template address seen on 3 advertisers is dropped');
  assert.deepEqual(pickContactEmail(rows[3], shared), { contact_email: 'stray@gmail.com', contact_email_source: 'funnel_text' });
  assert.deepEqual(pickContactEmail(rows[4], shared), { contact_email: null, contact_email_source: null });
});

const nextData = (pageProps) => `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps } })}</script></body></html>`;

test('skool parsers read discovery and about pages, prices in cents, owner links', () => {
  const disc = parseDiscovery(nextData({ page: 1, numGroups: 2, hasMore: false, groups: [
    { group: { name: 'air-bnb-pros', metadata: JSON.stringify({ displayName: 'Airbnb Pros', totalMembers: 120, currentMBp: '{"currency":"usd","amount":4900}', currentABp: '{"currency":"usd","amount":29000}', description: 'STR' }) } },
    { name: 'free-one', metadata: { displayName: 'Free One', totalMembers: 7 } },
  ] }));
  assert.deepEqual(disc.groups.map((g) => [g.name, g.members, g.price_monthly_usd, g.price_annual_usd]), [['air-bnb-pros', 120, 49, 290], ['free-one', 7, null, null]]);
  assert.equal(disc.has_more, false);
  const about = parseAbout(nextData({ currentGroup: { name: 'air-bnb-pros', metadata: { displayName: 'Airbnb Pros', totalMembers: 120, currentMBp: { currency: 'usd', amount: 4900 }, lpDescription: 'Join', owner: JSON.stringify({ first_name: 'Sam', last_name: 'Host', name: 'sam-host-1', metadata: { link_instagram: 'https://www.instagram.com/Sam.Host?igsh=abc', link_website: 'https://samhost.com' } }) } } }));
  assert.equal(about.owner.instagram, 'https://www.instagram.com/Sam.Host?igsh=abc');
  assert.equal(about.owner.website, 'https://samhost.com');
  assert.equal(about.price_monthly_usd, 49);
  assert.equal(parseAbout('<html>no data</html>'), null);
  assert.equal(parseDiscovery(''), null);
});

test('scoring adds community signals for seed rows and leaves ad rows unchanged', () => {
  const S = { tiers: { A: 10, B: 7, C: 4 }, signals: { followers_in_band: { min: 3000, max: 100000, points: 2 }, followers_over: { min: 1000, points: 1 }, ad_days_active: { min: 30, points: 2 }, ads_running: { min: 3, points: 1 }, funnel_type: { booking: 2 }, team_signal: {}, recent_post_days: { max: 30, points: 1 }, confidence: { high: 1 }, niche: {}, business_type: { coach: 1 }, community_members: { min: 50, points: 1 }, community_paid: { points: 1 } } };
  const seed = { follower_count: 5000, funnel_type: 'booking', classification_confidence: 'high', business_type: 'coach', community_members: 120, community_price_monthly_usd: 49 };
  const r = score(S, seed);
  assert.equal(r.fit_score, 8); assert.equal(r.fit_tier, 'B'); assert.match(r.fit_notes, /community_50\+, community_paid/);
  const ad = score(S, { ...seed, community_members: undefined, community_price_monthly_usd: undefined, ad_days_active: 60, ads_running: 4 });
  assert.equal(ad.fit_score, 9); assert.doesNotMatch(ad.fit_notes, /community/);
});
