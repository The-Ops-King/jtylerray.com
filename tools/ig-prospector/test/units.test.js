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
  assert.match(header, /^first_name,last_name,email,phone,ig_handle,ig_url,follower_count,offer_price,funnel_url,funnel_type,ads_running,ad_days_active,niche,team_signal,source,source_detail,date_sourced,notes,fit_tier,fit_score,fit_notes,business_type,/);
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
