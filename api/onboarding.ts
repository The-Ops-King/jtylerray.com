import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';

/**
 * /api/onboarding — the record behind jtylerray.com/client-onboarding.
 *
 *   POST {action:"start", firstName, lastName, email, phone, company, website}
 *        → creates a record, emails the client their private link, tells Tyler
 *   GET  ?id=…                → the record
 *   PUT  {id, answers, summary} → autosave
 *   POST {action:"submit", id, answers, summary}
 *        → marks it sent and mails Tyler the access list, red items first
 *
 * WHERE THINGS LIVE
 *  - Upstash Redis is the record (one JSON value per client, key onb:<id>).
 *    Added through Vercel → Storage → Upstash for Redis, which sets
 *    KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN;
 *    either pair works). Without it nothing can be saved, so every call says
 *    so plainly rather than pretending.
 *  - The Google Sheet is Tyler's view: one row per client, upserted by id on
 *    start, on submit, and at most every five minutes while they work.
 *    ONBOARDING_SHEET_WEBHOOK_URL, script in Resources/onboarding-sheet.gs.
 *  - Resend sends the emails (RESEND_API_KEY, RESEND_FROM, NOTIFY_EMAIL).
 *    RESEND_FROM must be on a verified domain: the client gets an email too,
 *    and Resend's sandbox sender only delivers to the account owner.
 *  - GHL_ONBOARDING_WEBHOOK_URL, if set, gets the same payload on start and
 *    submit, so a GHL workflow can text Tyler. Unset, it is skipped.
 *
 * The id is 128 random bits and is the only key to a record. Records never
 * hold passwords; the page tells clients not to type them, and nothing here
 * asks for one.
 *
 * The summary (what is green and what is red) is computed by the page from
 * the same catalog it draws, and sent with each save. This function only
 * stores and forwards it, escaped. A client misreporting their own checklist
 * gains nothing, and keeping one copy of the rules means the screen and the
 * email cannot disagree.
 */

const FROM = process.env.RESEND_FROM || 'Onboarding <onboarding@resend.dev>';
const TO = process.env.NOTIFY_EMAIL || 'jt@jtylerray.com';
const PHONE = '+1 480-516-3213';

const MAX_BODY = 64 * 1024;
const STARTS_PER_HOUR = 10;
const SHEET_EVERY_MS = 5 * 60 * 1000;

type Flag = 'green' | 'red' | 'amber' | 'todo';
type Item = {
  section: string;
  tool: string;
  role: string;
  flag: Flag;
  answer: string;
  reason?: string;
  note?: string;
};
type Client = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  website: string;
};
type OnboardingRecord = {
  id: string;
  client: Client;
  answers: unknown;
  summary: Item[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  sheetSyncedAt?: string;
};

/* ── redis ───────────────────────────────────────────────────────────── */

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis<T = unknown>(...cmd: (string | number)[]): Promise<T> {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Storage is not set up yet');
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const body = (await r.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!r.ok || body.error) throw new Error(`Storage error: ${body.error || r.status}`);
  return body.result as T;
}

const key = (id: string) => `onb:${id}`;

async function load(id: string): Promise<OnboardingRecord | null> {
  const raw = await redis<string | null>('GET', key(id));
  return raw ? (JSON.parse(raw) as OnboardingRecord) : null;
}
const store = (rec: OnboardingRecord) => redis('SET', key(rec.id), JSON.stringify(rec));

/* ── input ───────────────────────────────────────────────────────────── */

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{20,40}$/.test(id);

function cleanSummary(v: unknown): Item[] {
  if (!Array.isArray(v)) return [];
  const flags: Flag[] = ['green', 'red', 'amber', 'todo'];
  return v.slice(0, 80).map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return {
      section: str(o.section, 60),
      tool: str(o.tool, 80),
      role: str(o.role, 80),
      flag: flags.includes(o.flag as Flag) ? (o.flag as Flag) : 'todo',
      answer: str(o.answer, 120),
      reason: str(o.reason, 120) || undefined,
      note: str(o.note, 2000) || undefined,
    };
  });
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (JSON.stringify(b).length > MAX_BODY) throw new Error('Too much data');
  return b as Record<string, unknown>;
}

/* ── outputs ─────────────────────────────────────────────────────────── */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sheets reads = + - @ as a formula; see the same guard in api/apply.ts */
function sheetSafe(v: unknown): string {
  const s = (v ?? '').toString().trim();
  if (s.startsWith('+')) return s.replace(/^\+\s*/, '');
  return /^[=\-@]/.test(s) ? ` ${s}` : s;
}

function baseUrl(req: VercelRequest): string {
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'jtylerray.com').toString();
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}
const linkFor = (req: VercelRequest, id: string) =>
  `${baseUrl(req)}/client-onboarding?c=${encodeURIComponent(id)}`;

const fullName = (c: Client) => `${c.firstName} ${c.lastName}`.trim();
const reds = (rec: OnboardingRecord) => rec.summary.filter((i) => i.flag === 'red');

function payload(rec: OnboardingRecord, link: string, event: string) {
  const red = reds(rec);
  const done = rec.summary.filter((i) => i.flag === 'green' || i.flag === 'amber').length;
  return {
    event,
    id: rec.id,
    link,
    ...rec.client,
    name: fullName(rec.client),
    status: rec.submittedAt ? 'Submitted' : 'In progress',
    progress: rec.summary.length ? `${done}/${rec.summary.length}` : '',
    redCount: red.length,
    red: red.map((i) => `${i.tool}: ${i.reason}`).join('\n'),
    items: rec.summary
      .map((i) => `[${i.flag.toUpperCase()}] ${i.section} / ${i.tool}: ${i.answer}${i.note ? ` (note: ${i.note})` : ''}`)
      .join('\n'),
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    submittedAt: rec.submittedAt || '',
  };
}

async function toSheet(rec: OnboardingRecord, link: string, event: string): Promise<boolean> {
  const url = process.env.ONBOARDING_SHEET_WEBHOOK_URL;
  if (!url) return false;
  try {
    const p = payload(rec, link, event);
    const cells = Object.fromEntries(
      Object.entries(p).map(([k, v]) => [k, typeof v === 'string' ? sheetSafe(v) : v])
    );
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cells),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function toGhl(rec: OnboardingRecord, link: string, event: string): Promise<void> {
  const url = process.env.GHL_ONBOARDING_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload(rec, link, event)),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* a missed text is not worth failing the client's save over */
  }
}

async function mail(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    return !error;
  } catch {
    return false;
  }
}

const FLAG_COLOR: Record<Flag, string> = {
  red: '#b3261e',
  green: '#2e7d4f',
  amber: '#a37400',
  todo: '#777',
};

function summaryTable(items: Item[]): string {
  const order: Flag[] = ['red', 'todo', 'amber', 'green'];
  const sorted = [...items].sort((a, b) => order.indexOf(a.flag) - order.indexOf(b.flag));
  const td = 'border:1px solid #ddd;padding:6px;vertical-align:top';
  const rows = sorted
    .map(
      (i) =>
        `<tr><td style="${td};color:${FLAG_COLOR[i.flag]};font-weight:bold">${i.flag.toUpperCase()}</td>` +
        `<td style="${td}">${esc(i.section)}</td>` +
        `<td style="${td}"><strong>${esc(i.tool)}</strong>${i.role ? `<br><span style="color:#666">${esc(i.role)}</span>` : ''}</td>` +
        `<td style="${td}">${esc(i.reason || i.answer)}</td>` +
        `<td style="${td};white-space:pre-wrap">${esc(i.note || '')}</td></tr>`
    )
    .join('');
  return (
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">` +
    `<tr><th style="${td}">State</th><th style="${td}">Section</th><th style="${td}">Tool</th><th style="${td}">Answer</th><th style="${td}">Notes</th></tr>` +
    `${rows}</table>`
  );
}

function clientBlock(c: Client): string {
  return (
    `<p style="font-family:sans-serif;font-size:14px">` +
    `${esc(fullName(c))} · ${esc(c.company)} · ${esc(c.website)}<br>` +
    `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a> · ${esc(c.phone)}</p>`
  );
}

/* ── handlers ────────────────────────────────────────────────────────── */

async function start(req: VercelRequest, res: VercelResponse, b: Record<string, unknown>) {
  // honeypot: answer like a success so a bot has nothing to tune against
  if (str(b.fax)) return res.status(200).json({ ok: true, id: randomBytes(16).toString('base64url') });

  const client: Client = {
    firstName: str(b.firstName, 80),
    lastName: str(b.lastName, 80),
    email: str(b.email, 200),
    phone: str(b.phone, 40),
    company: str(b.company, 120),
    website: str(b.website, 200),
  };
  const missing = Object.entries(client).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return res.status(400).json({ ok: false, error: `Missing: ${missing.join(', ')}` });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(client.email)) {
    return res.status(400).json({ ok: false, error: 'That email address looks wrong' });
  }

  // starting sends an email to whatever address was typed, so it is
  // rate-limited per IP to keep the form from being used to spam people
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || 'unknown';
  const rl = `onb:rl:${ip}`;
  const count = await redis<number>('INCR', rl);
  if (count === 1) await redis('EXPIRE', rl, 3600);
  if (count > STARTS_PER_HOUR) {
    return res.status(429).json({ ok: false, error: 'Too many new onboardings from here. Try again in an hour' });
  }

  const now = new Date().toISOString();
  const rec: OnboardingRecord = {
    id: randomBytes(16).toString('base64url'),
    client,
    answers: null,
    summary: [],
    createdAt: now,
    updatedAt: now,
    sheetSyncedAt: now,
  };
  await store(rec);

  const link = linkFor(req, rec.id);
  await Promise.all([
    mail(
      client.email,
      'Your onboarding link',
      `<div style="font-family:sans-serif;font-size:15px;line-height:1.6">` +
        `<p>Hi ${esc(client.firstName)},</p>` +
        `<p>Here's your private onboarding link. It saves as you go, so you can close it and come back any time:</p>` +
        `<p><a href="${esc(link)}">${esc(link)}</a></p>` +
        `<p>Anyone with the link can see your checklist, so keep it to yourself. Never send me a password by email or text. The page shows you how to share the one login I need.</p>` +
        `<p>Stuck on anything? Text me at ${PHONE}.</p>` +
        `<p>Tyler</p></div>`,
      TO
    ),
    mail(
      TO,
      `Onboarding started: ${fullName(client)} (${client.company})`,
      clientBlock(client) + `<p style="font-family:sans-serif"><a href="${esc(link)}">Open their checklist</a></p>`,
      client.email
    ),
    toSheet(rec, link, 'start'),
    toGhl(rec, link, 'start'),
  ]);

  return res.status(200).json({ ok: true, id: rec.id });
}

async function save(req: VercelRequest, res: VercelResponse, b: Record<string, unknown>) {
  if (!validId(b.id)) return res.status(400).json({ ok: false, error: 'Bad link' });
  const rec = await load(b.id);
  if (!rec) return res.status(404).json({ ok: false, error: 'This onboarding link was not found' });

  const now = new Date().toISOString();
  rec.answers = b.answers ?? rec.answers;
  rec.summary = cleanSummary(b.summary);
  rec.updatedAt = now;

  // the sheet is a view, so it is refreshed while they work but not on every
  // keystroke: Apps Script takes a second or two per call
  const due = !rec.sheetSyncedAt || Date.now() - Date.parse(rec.sheetSyncedAt) > SHEET_EVERY_MS;
  if (due && (await toSheet(rec, linkFor(req, rec.id), 'progress'))) rec.sheetSyncedAt = now;

  await store(rec);
  return res.status(200).json({ ok: true, updatedAt: now });
}

async function submit(req: VercelRequest, res: VercelResponse, b: Record<string, unknown>) {
  if (!validId(b.id)) return res.status(400).json({ ok: false, error: 'Bad link' });
  const rec = await load(b.id);
  if (!rec) return res.status(404).json({ ok: false, error: 'This onboarding link was not found' });

  const now = new Date().toISOString();
  const again = Boolean(rec.submittedAt);
  rec.answers = b.answers ?? rec.answers;
  rec.summary = cleanSummary(b.summary);
  rec.updatedAt = now;
  rec.submittedAt = now;
  rec.sheetSyncedAt = now;
  await store(rec);

  const link = linkFor(req, rec.id);
  const red = reds(rec);
  const c = rec.client;
  const subject =
    `${again ? 'Onboarding updated' : 'Onboarding submitted'}: ${c.company}` +
    (red.length ? ` (${red.length} red)` : ' (all clear)');
  const html =
    clientBlock(c) +
    `<p style="font-family:sans-serif;font-size:14px">` +
    (red.length
      ? `<strong style="color:${FLAG_COLOR.red}">${red.length} item${red.length > 1 ? 's' : ''} still need admin.</strong> `
      : `<strong style="color:${FLAG_COLOR.green}">Everything is marked admin.</strong> `) +
    `<a href="${esc(link)}">Open their checklist</a></p>` +
    summaryTable(rec.summary);

  const [mailed, sheeted] = await Promise.all([
    mail(TO, subject, html, c.email),
    toSheet(rec, link, 'submit'),
    toGhl(rec, link, 'submit'),
  ]);

  return res.status(200).json({ ok: true, submittedAt: now, email: mailed, sheet: sheeted });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  try {
    if (req.method === 'GET') {
      const id = req.query.id;
      if (!validId(id)) return res.status(400).json({ ok: false, error: 'Bad link' });
      const rec = await load(id);
      if (!rec) return res.status(404).json({ ok: false, error: 'This onboarding link was not found' });
      const { sheetSyncedAt: _s, summary: _m, ...pub } = rec;
      return res.status(200).json({ ok: true, record: pub });
    }

    const b = parseBody(req);
    if (req.method === 'PUT') return await save(req, res, b);
    if (req.method === 'POST' && b.action === 'start') return await start(req, res, b);
    if (req.method === 'POST' && b.action === 'submit') return await submit(req, res, b);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
