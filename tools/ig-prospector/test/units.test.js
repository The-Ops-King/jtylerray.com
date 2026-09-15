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

test('criteria rules report the first failing rule with detail', () => {
  const C = CriteriaSchema.parse({ min_followers: 3000, max_followers: 30000, min_offer_price_usd: 3000, allowed_funnel_types: ['booking', 'application'], min_ad_days_active: 60, max_days_since_last_post: 30, exclude_if_agency: true, exclude_if_sells_to_beginner_coaches: true });
  const rules = buildRules(C);
  const good = { profile_found: true, follower_count: 10000, days_since_last_post: 3, source: 'adlibrary', ad_days_active: 90, is_agency: false, sells_to_beginner_coaches: false, funnel_type: 'booking', offer_price: 5000, classification_confidence: 'high' };
  assert.equal(evaluate(rules, good), null);
  assert.deepEqual(evaluate(rules, { ...good, follower_count: 100 }), { rejected_by: 'min_followers', reject_detail: 'follower_count=100' });
  assert.deepEqual(evaluate(rules, { ...good, profile_found: false }), { rejected_by: 'profile_not_found', reject_detail: 'profile_error=not_returned' });
  assert.deepEqual(evaluate(rules, { ...good, funnel_type: 'webinar' }), { rejected_by: 'allowed_funnel_types', reject_detail: 'funnel_type=webinar' });
  assert.equal(evaluate(rules, { ...good, offer_price: null }), null, 'unknown price passes unless require_known_price');
  assert.deepEqual(evaluate(buildRules({ ...C, require_known_price: true }), { ...good, offer_price: null }), { rejected_by: 'require_known_price', reject_detail: 'offer_price=null' });
  assert.equal(evaluate(rules, { ...good, source: 'manual', ad_days_active: null }), null, 'manual rows skip the ad-days rule');
  assert.equal(evaluate(buildRules({ ...C, min_followers: null }), { ...good, follower_count: 1 }), null, 'null disables a rule');
  assert.throws(() => CriteriaSchema.parse({ ...C, bogus: 1 }), /unrecognized/i);
});

test('csv export matches the column contract and escapes', () => {
  const rec = toRecord({ ig_handle: 'a.b', ig_url: 'https://www.instagram.com/a.b/', first_name: 'A', last_name: 'B, Jr', follower_count: 5, classification_confidence: 'high', funnel_url: 'https://x.y', source: 'adlibrary', source_detail: 't', date_sourced: '2026-09-15' }, 'ig.placeholder');
  assert.equal(rec.email, 'a.b@ig.placeholder');
  const csv = toCsv([rec]);
  const [header, row] = csv.trim().split('\n');
  assert.equal(header, CSV_COLUMNS.join(','));
  assert.equal(header, 'first_name,last_name,email,phone,ig_handle,ig_url,follower_count,offer_price,funnel_url,funnel_type,ads_running,ad_days_active,niche,team_signal,source,source_detail,date_sourced,notes');
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
  writeNdjson(f, [{ ig_handle: 'z' }]);
  assert.deepEqual(readNdjson(f), [{ ig_handle: 'z' }]);
});

test('cli flags', () => {
  assert.deepEqual(parseArgs(['--force', '--limit', '20', '--no-fetch']), { force: true, limit: 20, dryRun: false, noGhl: false, positional: [], noFetch: true });
  assert.throws(() => parseArgs(['--limit', 'x']));
});

test('classification schema is strict', () => {
  const ok = { owner_first_name: null, owner_last_name: null, niche: 'business', funnel_type: 'booking', offer_price_usd: null, sells_to_coaches_about_getting_first_client: false, is_agency_or_systems_provider: false, team_signal: 'unknown', confidence: 'low' };
  assert.equal(ClassificationSchema.safeParse(ok).success, true);
  assert.equal(ClassificationSchema.safeParse({ ...ok, niche: 'crypto' }).success, false);
  assert.equal(ClassificationSchema.safeParse({ ...ok, extra: 1 }).success, false);
});
