/**
 * Offline end-to-end run of steps 2-7 in a temp home. Proves: resolve grouping + free IG-link fallback, cache-only
 * enrichment (zero spend), funnel fetch with a local server, classify served from cache, filter rejects with reasons,
 * CSV contract, idempotent rerun (no duplicates, no spend), and resume after a truncated output file.
 * Step 1 (Apify Ad Library) and live Anthropic/GHL calls are not exercised here: they need network + keys.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(here, '..');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'igp-'));
const env = { ...process.env, IG_PROSPECTOR_HOME: HOME, APIFY_TOKEN: 'test-token', ANTHROPIC_API_KEY: '', GHL_PRIVATE_TOKEN: '', GHL_LOCATION_ID: '' };
const D = (f) => path.join(HOME, 'data', f);
import { readNdjson } from '../src/lib/ndjson.js';
const lines = (f) => readNdjson(D(f));

// Async so the in-process fixture server can answer the child's requests while it runs.
async function run(step, ...flags) {
  try {
    const r = await execFileP(process.execPath, [path.join(PKG, 'src', `steps/${step}.js`), ...flags], { env, encoding: 'utf8', timeout: 60000 });
    return r.stdout;
  } catch (e) { throw new Error(`${step} failed (${e.code})\n${e.stdout}\n${e.stderr}`); }
}

let server; let base;
before(async () => {
  fs.mkdirSync(path.join(HOME, 'config'), { recursive: true });
  for (const f of fs.readdirSync(path.join(PKG, 'config'))) if (f.endsWith('.json')) fs.copyFileSync(path.join(PKG, 'config', f), path.join(HOME, 'config', f));
  server = http.createServer((req, res) => {
    const pages = {
      '/funnel-a': '<html><head><title>Apply to work with Alice</title></head><body><h1>1:1 Business Coaching</h1><p>Investment: $5,000. Apply below and my setter will reach out.</p><a href="/apply">Apply now</a></body></html>',
      '/page-b': '<html><body><p>Bob fitness</p><a href="https://www.instagram.com/coach_bob/">IG</a></body></html>',
      '/redirect': null,
    };
    if (req.url === '/redirect') { res.writeHead(302, { location: '/funnel-a' }); return res.end(); }
    if (pages[req.url]) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(pages[req.url]); }
    res.writeHead(404); res.end('nope');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;

  const ago = (d) => Math.floor((Date.now() - d * 86400000) / 1000);
  const ad = (page_id, page_name, extra) => ({ ad_archive_id: `${page_id}-${Math.random()}`, page_id, page_name, is_active: true, start_date: ago(100), snapshot: { page_name, ...extra } });
  const items = [
    ad('1', 'Alice Coaching', { instagram_actor_name: 'Coach.Alice', link_url: `${base}/redirect` }),
    ad('1', 'Alice Coaching', { instagram_actor_name: 'Coach.Alice', link_url: `${base}/redirect` }),
    { ...ad('1', 'Alice Coaching', { link_url: `${base}/redirect` }), is_active: false, start_date: ago(400) },
    ad('2', 'Bob Fit', { link_url: `${base}/page-b` }),
    ad('3', 'Nobody Inc', {}),
    ad('4', 'Carol', { link_url: 'https://l.facebook.com/l.php?u=https%3A%2F%2Finstagram.com%2Fcarol.coach' }),
  ];
  fs.mkdirSync(D('raw/adlib'), { recursive: true });
  fs.writeFileSync(D('raw/adlib/test-term.json'), JSON.stringify({ term: 'test term', items }));
  fs.mkdirSync(D('raw/manual'), { recursive: true });
  fs.writeFileSync(D('raw/manual/hand.json'), JSON.stringify([{ page_id: 'm1', page_name: 'Manual Dan', instagram_actor_name: 'dan_manual', link_url: `${base}/funnel-a` }]));
});
after(() => server?.close());

test('resolve groups ads per page, falls back to funnel-page IG link, writes unresolved', async () => {
  await run('resolve');
  const rows = lines('resolved.ndjson');
  const byH = Object.fromEntries(rows.map((r) => [r.ig_handle, r]));
  assert.deepEqual(Object.keys(byH).sort(), ['carol.coach', 'coach.alice', 'coach_bob', 'dan_manual']);
  assert.equal(byH['coach.alice'].ads_running, 2);
  assert.equal(byH['coach.alice'].ads_seen, 3);
  assert.equal(byH['coach.alice'].ad_days_active, 400);
  assert.equal(byH['coach.alice'].handle_source, 'ad');
  assert.equal(byH['coach_bob'].handle_source, 'funnel_page');
  assert.equal(byH['dan_manual'].source, 'manual');
  assert.equal(byH['carol.coach'].funnel_url, null, 'instagram links are not funnel urls');
  const un = lines('unresolved.ndjson');
  assert.equal(un.length, 1); assert.equal(un[0].page_name, 'Nobody Inc');
});

test('enrich-profile serves everything from cache and spends nothing', async () => {
  const cacheDir = path.join(HOME, 'cache', 'apify-ig');
  fs.mkdirSync(cacheDir, { recursive: true });
  const post = (d) => ({ timestamp: new Date(Date.now() - d * 86400000).toISOString() });
  const put = (h, item, error) => fs.writeFileSync(path.join(cacheDir, `${h}.json`), JSON.stringify({ key: h, value: { item, error } }));
  put('coach.alice', { username: 'Coach.Alice', fullName: 'Alice A', biography: 'I help coaches scale to 50k/mo', externalUrl: `${base}/redirect`, followersCount: 12000, postsCount: 300, private: false, latestPosts: [post(9), post(2)] });
  put('coach_bob', { username: 'coach_bob', biography: 'fit', followersCount: 400, postsCount: 10, latestPosts: [post(1)] });
  put('carol.coach', null, 'not_returned');
  put('dan_manual', { username: 'dan_manual', biography: 'dan', followersCount: 8000, postsCount: 50, latestPosts: [post(5)] });
  await run('enrich-profile');
  const rows = lines('profiles.ndjson');
  assert.equal(rows.length, 4);
  const alice = rows.find((r) => r.ig_handle === 'coach.alice');
  assert.equal(alice.follower_count, 12000); assert.equal(alice.days_since_last_post, 2); assert.equal(alice.profile_found, true);
  assert.equal(rows.find((r) => r.ig_handle === 'carol.coach').profile_found, false);
  assert.equal(fs.existsSync(D('costs.ndjson')), false, 'no credits spent');
});

test('enrich-funnel follows one redirect, caches html, handles missing url', async () => {
  await run('enrich-funnel');
  const rows = lines('funnels.ndjson');
  assert.equal(rows.length, 4);
  const alice = rows.find((r) => r.ig_handle === 'coach.alice');
  assert.equal(alice.funnel_final_url, `${base}/funnel-a`);
  assert.equal(alice.funnel_status, 200);
  assert.match(alice.funnel_text, /Investment: \$5,000/);
  assert.equal(rows.find((r) => r.ig_handle === 'carol.coach').funnel_url, null);
  assert.ok(fs.readdirSync(path.join(HOME, 'cache', 'http')).length >= 2, 'raw html cached');
});

test('classify (agent mode) queues inputs, ingests validated answers, rejects stale and invalid ones', async () => {
  const out1 = await run('classify');
  assert.match(out1, /4 enriched rows, 2 pass pre-classification rules/); // bob (400 followers) and carol (not found) never classified
  assert.match(out1, /2 still pending/);
  const queue = lines('classify-queue.ndjson');
  assert.deepEqual(queue.map((q) => q.ig_handle).sort(), ['coach.alice', 'dan_manual'], 'bob (400 followers) and carol (not found) are never classified');
  assert.ok(fs.existsSync(D('classify-instructions.md')));
  const cls = (over) => ({ owner_first_name: null, owner_last_name: null, business_type: 'coach', niche: 'business', funnel_type: 'application', offer_price_usd: 5000, sells_to_coaches_about_getting_first_client: false, is_agency_or_systems_provider: false, team_signal: 'has_setter', confidence: 'high', ...over });
  const answers = { 'coach.alice': cls({ owner_first_name: 'Alice', owner_last_name: 'A' }), coach_bob: cls({ niche: 'fitness', funnel_type: 'none', offer_price_usd: null, confidence: 'low' }), 'carol.coach': cls({ funnel_type: 'none', offer_price_usd: null, confidence: 'low' }), dan_manual: cls({ owner_first_name: 'Dan', is_agency_or_systems_provider: true }) };
  const q = Object.fromEntries(queue.map((x) => [x.ig_handle, x]));
  const A = D('classify-answers.ndjson');
  fs.writeFileSync(A, [
    JSON.stringify({ ig_handle: 'coach.alice', input_hash: 'stale', model: 'test', classification: answers['coach.alice'] }),
    JSON.stringify({ ig_handle: 'dan_manual', input_hash: q.dan_manual.input_hash, model: 'test', classification: { ...answers.dan_manual, niche: 'crypto' } }),
  ].join('\n') + '\n');
  await run('classify').then(() => assert.fail('should exit non-zero when answers are rejected'), (e) => assert.match(e.message, /ingested 0 answer\(s\), 2 rejected/));
  assert.equal(lines('classified.ndjson').length, 0);
  const fails = lines('classify-failures.ndjson');
  assert.deepEqual(fails.map((f) => [f.ig_handle, f.error.split(':')[0]]), [['coach.alice', 'stale answer'], ['dan_manual', 'schema']]);
  assert.equal(lines('classify-queue.ndjson').length, 2, 'rejected ones stay queued');
  fs.writeFileSync(A, ['coach.alice', 'dan_manual'].map((h) => JSON.stringify({ ig_handle: h, input_hash: q[h].input_hash, model: 'test', classification: answers[h] })).join('\n') + '\n');
  const out3 = await run('classify');
  assert.match(out3, /ingested 2 answer\(s\), 0 rejected .* 0 from cache, 0 still pending/);
  const rows = lines('classified.ndjson');
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.ig_handle === 'coach.alice').first_name, 'Alice');
  assert.equal(fs.existsSync(D('costs.ndjson')), false, 'no credits spent');
  assert.ok(fs.readdirSync(path.join(HOME, 'cache', 'classify')).length === 2, 'answers cached by input hash');
});

test('filter applies criteria.json and explains every reject', async () => {
  const out = await run('filter');
  assert.match(out, /4 enriched \(2 classified\) -> 1 qualified, 3 rejected/);
  assert.match(out, /tiers: /);
  const q = lines('qualified.ndjson'); const rej = lines('rejects.ndjson');
  assert.deepEqual(q.map((r) => r.ig_handle), ['coach.alice']);
  const why = Object.fromEntries(rej.map((r) => [r.ig_handle, r.rejected_by]));
  assert.deepEqual(why, { coach_bob: 'min_followers', 'carol.coach': 'profile_not_found', dan_manual: 'exclude_if_agency' });
  // Change criteria, rerun step 6 only: dan now passes the agency rule but fails funnel type? (application allowed) -> qualifies.
  assert.equal(q[0].fit_tier !== undefined && q[0].fit_notes.includes('funnel:application'), true, 'graded');
  const cfgFile = path.join(HOME, 'config', 'criteria.json');
  const c = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); c.exclude_if_agency = false; fs.writeFileSync(cfgFile, JSON.stringify(c));
  await run('filter');
  assert.deepEqual(lines('qualified.ndjson').map((r) => r.ig_handle).sort(), ['coach.alice', 'dan_manual']);
});

test('export writes the CSV contract and is CSV-only by default', async () => {
  const out = await run('export');
  assert.match(out, /CSV only/);
  const csv = fs.readFileSync(D('export.csv'), 'utf8').trim().split('\n');
  assert.match(csv[0], /^first_name,last_name,email,phone,ig_handle,ig_url,follower_count,offer_price,funnel_url,funnel_type,ads_running,ad_days_active,niche,team_signal,source,source_detail,date_sourced,notes,/);
  assert.equal(csv.length, 3);
  assert.match(csv[0], /,notes,fit_tier,fit_score,fit_notes,business_type,confidence,days_since_last_post,last_post_at,post_count,bio_link,fb_page_name$/);
  const aliceRow = csv.find((l) => l.startsWith('Alice,'));
  assert.match(aliceRow, /^Alice,A,coach\.alice@ig\.placeholder,,coach\.alice,https:\/\/www\.instagram\.com\/coach\.alice\/,12000,5000,http:\/\/127\.0\.0\.1:\d+\/funnel-a,application,2,400,business,has_setter,adlibrary,test term,\d{4}-\d{2}-\d{2},/);
});

test('rerun is idempotent: no duplicates, nothing spent', async () => {
  const before = ['resolved', 'profiles', 'funnels', 'classified'].map((f) => lines(`${f}.ndjson`).length);
  await run('discover');
  assert.deepEqual(lines('discover-queue.ndjson').map((q) => q.page_name), ['Nobody Inc'], 'unresolved page that could still qualify is queued for discovery');
  fs.writeFileSync(D('discover-answers.ndjson'), JSON.stringify({ page_id: '3', page_name: 'Nobody Inc', ig_handle: null, evidence: 'no account found', confidence: 'high', model: 'test' }) + '\n');
  assert.match(await run('discover'), /ingested 1 answer\(s\).*0 queued/);
  await run('resolve');
  assert.equal(lines('unresolved.ndjson')[0].reason, 'searched_no_instagram_found');
  await run('resolve'); await run('enrich-profile'); await run('enrich-funnel');
  fs.unlinkSync(D('classify-answers.ndjson'));
  assert.match(await run('classify'), /0 still pending/);
  const after = ['resolved', 'profiles', 'funnels', 'classified'].map((f) => lines(`${f}.ndjson`).length);
  assert.deepEqual(after, before);
  assert.equal(fs.existsSync(D('costs.ndjson')), false);
});

test('resume: a truncated output file is completed without duplicates', async () => {
  const f = D('profiles.ndjson');
  const all = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  fs.writeFileSync(f, all[0] + '\n' + '{"ig_handle":"coach_bob","torn":');
  await run('enrich-profile');
  const rows = lines('profiles.ndjson');
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map((r) => r.ig_handle)).size, 4);
  const raw = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  assert.equal(raw.length, 5, 'torn line isolated on its own line, 4 good rows');
});
