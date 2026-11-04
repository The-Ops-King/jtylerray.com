import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

/**
 * POST /api/apply — the B2B closer application at jtylerray.com/apply.
 *
 * The Google Sheet is where applications live: one row per applicant, appended
 * through an Apps Script web app whose /exec URL is GSHEET_WEBHOOK_URL. See
 * Resources/apply-sheet.gs for the script and the one-time setup.
 *
 * There is no email per application any more. One a day goes out from the
 * Sheet's own script instead, holding everyone who applied and qualified in
 * the last twenty four hours. See Resources/apply-sheet.gs.
 *
 * Env: GSHEET_WEBHOOK_URL. RESEND_API_KEY, RESEND_FROM and NOTIFY_EMAIL are
 * still read, but only to report that the Sheet refused a qualified
 * application: that is the one case where something has to be said at once,
 * because otherwise an application disappears and nothing anywhere says so.
 *
 * ── who gets through ───────────────────────────────────────────────────
 *
 * An application is recorded only if all of these hold:
 *   - B2B experience ticked
 *   - at least a year closing high ticket
 *   - a call recording link
 *   - that call dated within CALL_MAX_DAYS
 *
 * Everything else gets the same answer the page shows, and is not written
 * anywhere. The reply never says which criterion failed, because a form that
 * tells you why it rejected you can be re-run until it does not.
 *
 * The checks live here and not on the page. The page is a static bundle that
 * anybody can edit before it posts.
 */

/**
 * Whether the role is taking applications. MUST match OPEN in
 * hero-lab/src/apply/data.ts, which is what decides whether the page draws
 * the form. They are separate because the page is a static bundle and this is
 * a function, so neither can read the other's value at runtime.
 *
 * Taking the form off the page does not close this endpoint. Anyone holding
 * the page in an open tab, or any cached copy of it, can still post here, and
 * an application arriving for a role that is closed is worse than one that is
 * refused.
 *
 * Flip both or neither. Open here with the page closed is harmless, because
 * nothing renders a form to post from. Closed here with the page open means
 * every real applicant gets an error.
 */
const OPEN = true;

const FROM = process.env.RESEND_FROM || 'Applications <onboarding@resend.dev>';
const TO = process.env.NOTIFY_EMAIL || 'jt@jtylerray.com';

type Payload = {
  role?: string;
  years?: string;
  onOffer?: string;
  b2b?: string;
  callRecording?: string;
  callDate?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  facebook?: string;
  videoUrl?: string;
  experience?: string;
  submittedAt?: string;
  /** honeypot: a real person never fills a field they cannot see */
  company?: string;
};

const FIELDS: [keyof Payload, string][] = [
  ['role', 'Role'],
  ['firstName', 'First name'],
  ['years', 'Years closing'],
  ['onOffer', 'On an offer now'],
  ['b2b', 'B2B experience'],
  ['callRecording', 'Call recording'],
  ['callDate', 'Call date'],
  ['lastName', 'Last name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['facebook', 'Facebook'],
  ['videoUrl', 'Intro video'],
  ['experience', 'High-ticket experience'],
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** the applicant-typed fields, in the order the Sheet's columns run */
const SHEET_TEXT: (keyof Payload)[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'facebook',
  'videoUrl',
  'experience',
  /* appended, not inserted: the Sheet's columns are positional, and a new one
     in the middle would shift every row already in it by one */
  'role',
  'years',
  'onOffer',
  'b2b',
  'callRecording',
  'callDate',
];

/**
 * Google Sheets parses a cell opening with = + - or @ as a formula, so a phone
 * typed as "+1 480-516-3213" landed as #ERROR!. This is the Sheet's problem
 * and it is solved on the way out, so the Apps Script never has to change.
 *
 * Only the Sheet copy is put through here. The email keeps exactly what the
 * applicant typed, which is what makes dropping the + safe: the country code
 * still exists in the inbox, on the one copy anybody dials from.
 *
 * The other three are pushed behind a space rather than cut. An experience box
 * that opens with a dash is a bullet, not a minus, and deleting the character
 * would quietly change what someone wrote about themselves.
 */
function sheetSafe(value: unknown): string {
  const s = (value ?? '').toString().trim();
  if (s.startsWith('+')) return s.replace(/^\+\s*/, '');
  return /^[=\-@]/.test(s) ? ` ${s}` : s;
}

/** How old a call recording may be. Matches CALL_MAX_DAYS in the page's data. */
const CALL_MAX_DAYS = 31;
const UNDER_ONE_YEAR = 'Less than 1 year';

/**
 * Whether an application is recorded at all.
 *
 * Returns the reasons rather than a boolean so the run can be logged with
 * something useful in it. The reasons never leave this function: the reply is
 * the same either way.
 */
function disqualify(data: Payload): string[] {
  const out: string[] = [];

  if ((data.b2b || '').toString().trim().toLowerCase() !== 'yes') {
    out.push('no B2B experience');
  }

  if ((data.years || '').toString().trim() === UNDER_ONE_YEAR) {
    out.push('under a year closing');
  }

  if (!(data.callRecording || '').toString().trim()) {
    out.push('no call recording');
  }

  /* A date input posts YYYY-MM-DD with no zone. Both sides are pinned to noon
     UTC so the gap between them is a whole number of days: anchored to the
     moment of submission instead, the same 31 day old call qualified at 9am
     and was turned away at 11pm, and nobody would ever have seen why.
     Noon also absorbs the time zone, so a call filed "today" from behind UTC
     does not read as tomorrow. */
  const raw = (data.callDate || '').toString().trim();
  const when = Date.parse(raw + 'T12:00:00Z');
  const now = Date.parse(new Date().toISOString().slice(0, 10) + 'T12:00:00Z');
  if (!raw || Number.isNaN(when)) {
    out.push('no usable call date');
  } else {
    const days = Math.round((now - when) / 86400000);
    if (days > CALL_MAX_DAYS) out.push(`call is ${days} days old`);
    if (days < -1) out.push('call is dated in the future');
  }

  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!OPEN) {
    // 410: the role was here and is not any more. The message is what a
    // cached page shows the applicant, so it says the thing rather than
    // failing at them.
    return res
      .status(410)
      .json({ ok: false, error: 'This role is no longer taking applications.' });
  }

  const data: Payload =
    typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // the honeypot answers first, and answers 200 so a bot has nothing to tune
  // against
  if ((data.company || '').toString().trim()) {
    return res.status(200).json({ ok: true });
  }

  const required: (keyof Payload)[] = [
    'role',
    'firstName',
    'lastName',
    'email',
    'phone',
    'facebook',
    'experience',
    'years',
    'onOffer',
    'callRecording',
    'callDate',
  ];
  const missing = required.filter((k) => !(data[k] || '').toString().trim());
  if (missing.length) {
    return res
      .status(400)
      .json({ ok: false, error: `Missing required fields: ${missing.join(', ')}` });
  }

  const email = (data.email || '').toString().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'That email address looks wrong' });
  }

  const name = `${(data.firstName || '').toString().trim()} ${(data.lastName || '')
    .toString()
    .trim()}`.trim();
  const submittedAt = (data.submittedAt || '').toString().trim() || new Date().toISOString();

  /* Nothing is written for an application that does not qualify, and the
     answer is a 200: as far as the applicant is concerned the form worked,
     which it did. The page shows them the decline. */
  const failed = disqualify(data);
  if (failed.length) {
    console.log(`declined ${name}: ${failed.join(', ')}`);
    return res.status(200).json({ ok: true, qualified: false });
  }

  // ── the sheet ───────────────────────────────────────────────────────
  let sheetOk = false;
  let sheetError = 'GSHEET_WEBHOOK_URL is not set';
  if (process.env.GSHEET_WEBHOOK_URL) {
    try {
      const cells = Object.fromEntries(SHEET_TEXT.map((k) => [k, sheetSafe(data[k])]));
      const sr = await fetch(process.env.GSHEET_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, ...cells, name, submittedAt, source: 'apply' }),
      });
      sheetOk = sr.ok;
      if (!sheetOk) sheetError = `Sheet responded ${sr.status}`;
    } catch (err) {
      sheetError = String(err);
    }
  }

  /* ── the alarm ──────────────────────────────────────────────────────
     No email per application: that is what the daily digest is for. This
     only fires when the Sheet refused a qualified application, because the
     digest reads the Sheet, so a row that never landed is an application
     nothing anywhere will ever mention again. */
  if (sheetOk) {
    return res.status(200).json({ ok: true, qualified: true, sheet: true });
  }

  const rows = FIELDS.map(([key, label]) => {
    const val = (data[key] || '').toString().trim() || '—';
    return (
      `<tr><td style="border:1px solid #ddd;padding:6px"><strong>${label}</strong></td>` +
      `<td style="border:1px solid #ddd;padding:6px;white-space:pre-wrap">${escapeHtml(val)}</td></tr>`
    );
  }).join('');

  const html =
    `<h2>Application NOT written to the Sheet — ${escapeHtml(name)}</h2>` +
    `<p style="color:#b00">${escapeHtml(sheetError)}</p>` +
    `<p>This one will not be in the daily digest. It is below in full.</p>` +
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows}</table>`;

  let mailOk = false;
  let mailError = 'RESEND_API_KEY is not set';
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: FROM,
        to: TO,
        replyTo: email,
        subject: `Sheet failed, application not recorded: ${name}`,
        html,
      });
      mailOk = !error;
      if (error) mailError = error.message;
    } catch (err) {
      mailError = String(err);
    }
  }

  if (!mailOk) {
    // nothing took it, so the applicant is told rather than thanked for
    // something that went nowhere
    return res
      .status(502)
      .json({ ok: false, error: `Could not record the application (${sheetError}; ${mailError})` });
  }

  return res.status(200).json({ ok: true, qualified: true, sheet: false, email: true });
}
