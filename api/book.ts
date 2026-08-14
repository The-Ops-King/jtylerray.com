import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

/**
 * POST /api/book — the form on jtylerray.com/card.
 *
 * Five fields, mailed on as they were typed with the sender as the reply-to
 * address, so answering is a reply rather than a copy-paste. Same env vars as
 * /api/apply: RESEND_API_KEY (required), RESEND_FROM and NOTIFY_EMAIL
 * (optional).
 */

const FROM = process.env.RESEND_FROM || 'Card <onboarding@resend.dev>';
const TO = process.env.NOTIFY_EMAIL || 'jt@jtylerray.com';

type Payload = {
  name?: string;
  email?: string;
  phone?: string;
  bestTime?: string;
  message?: string;
  /** honeypot: a real person never fills a field they cannot see */
  company?: string;
};

const FIELDS: [keyof Payload, string][] = [
  ['name', 'Name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['bestTime', 'Best time'],
  ['message', "What's broken"],
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ ok: false, error: 'Email service not configured' });
  }

  const data: Payload =
    typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // the honeypot answers before anything else, and answers 200 so a bot has
  // nothing to tune against
  if ((data.company || '').toString().trim()) {
    return res.status(200).json({ ok: true });
  }

  const missing = (['name', 'email', 'message'] as (keyof Payload)[]).filter(
    (k) => !(data[k] || '').toString().trim()
  );
  if (missing.length) {
    return res
      .status(400)
      .json({ ok: false, error: `Missing required fields: ${missing.join(', ')}` });
  }

  const email = (data.email || '').toString().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'That email address looks wrong' });
  }

  const rows = FIELDS.map(([key, label]) => {
    const val = (data[key] || '').toString().trim() || '—';
    return (
      `<tr><td style="border:1px solid #ddd;padding:6px"><strong>${label}</strong></td>` +
      `<td style="border:1px solid #ddd;padding:6px;white-space:pre-wrap">${escapeHtml(val)}</td></tr>`
    );
  }).join('');

  const html =
    `<h2>New card enquiry</h2>` +
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows}</table>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Card: ${(data.name || '').toString().trim()}`,
      html,
    });
    if (error) {
      return res.status(502).json({ ok: false, error: error.message });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
