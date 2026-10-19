import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

/**
 * POST /api/apply — the closer application at jtylerray.com/apply.
 *
 * The Google Sheet is where applications live: one row per applicant, appended
 * through an Apps Script web app whose /exec URL is GSHEET_WEBHOOK_URL. See
 * Resources/apply-sheet.gs for the script and the one-time setup.
 *
 * The email is a copy, not the record — it is what makes a new application
 * arrive rather than wait to be noticed. Env: GSHEET_WEBHOOK_URL (the sheet),
 * RESEND_API_KEY (the copy), RESEND_FROM and NOTIFY_EMAIL (optional).
 *
 * A submission succeeds if either sink took it. Losing an application because
 * one of two services was down is the only outcome worth writing code against.
 */

const FROM = process.env.RESEND_FROM || 'Applications <onboarding@resend.dev>';
const TO = process.env.NOTIFY_EMAIL || 'jt@jtylerray.com';

type Payload = {
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
  ['firstName', 'First name'],
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const data: Payload =
    typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // the honeypot answers first, and answers 200 so a bot has nothing to tune
  // against
  if ((data.company || '').toString().trim()) {
    return res.status(200).json({ ok: true });
  }

  const required: (keyof Payload)[] = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'facebook',
    'experience',
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

  // ── the copy ────────────────────────────────────────────────────────
  const rows = FIELDS.map(([key, label]) => {
    const val = (data[key] || '').toString().trim() || '—';
    return (
      `<tr><td style="border:1px solid #ddd;padding:6px"><strong>${label}</strong></td>` +
      `<td style="border:1px solid #ddd;padding:6px;white-space:pre-wrap">${escapeHtml(val)}</td></tr>`
    );
  }).join('');

  const html =
    `<h2>New closer application — ${escapeHtml(name)}</h2>` +
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows}</table>` +
    (sheetOk ? '' : `<p style="color:#b00">Not written to the Sheet: ${escapeHtml(sheetError)}</p>`);

  let mailOk = false;
  let mailError = 'RESEND_API_KEY is not set';
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: FROM,
        to: TO,
        replyTo: email,
        subject: `Closer application: ${name}`,
        html,
      });
      mailOk = !error;
      if (error) mailError = error.message;
    } catch (err) {
      mailError = String(err);
    }
  }

  if (!sheetOk && !mailOk) {
    // both sinks are down, so the applicant is told rather than thanked for
    // something that went nowhere
    return res
      .status(502)
      .json({ ok: false, error: `Could not record the application (${sheetError}; ${mailError})` });
  }

  return res.status(200).json({ ok: true, sheet: sheetOk, email: mailOk });
}
