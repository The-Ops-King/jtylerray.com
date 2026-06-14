import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

// Set in Vercel project env: RESEND_API_KEY (required).
// Optional: RESEND_FROM (defaults to Resend's shared onboarding sender),
//           NOTIFY_EMAIL (defaults to jt@jtylerray.com).
const FROM = process.env.RESEND_FROM || 'Applications <onboarding@resend.dev>';
const TO = process.env.NOTIFY_EMAIL || 'jt@jtylerray.com';

const FIELDS: [keyof Payload, string][] = [
  ['name', 'Name'],
  ['email', 'Email'],
  ['facebook', 'Facebook'],
  ['position', 'Position'],
  ['commissionTarget', 'Monthly Commission Target'],
  ['topRevenueMonth', 'Top Revenue Month'],
  ['closingExperience', 'Closing Experience'],
  ['realEstateExperience', 'Real Estate Experience'],
  ['loomUrl', 'Loom URL'],
  ['anythingElse', 'Anything Else'],
];

type Payload = {
  name?: string;
  email?: string;
  facebook?: string;
  position?: string;
  commissionTarget?: string;
  topRevenueMonth?: string;
  closingExperience?: string;
  realEstateExperience?: string;
  loomUrl?: string;
  anythingElse?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ ok: false, error: 'Email service not configured' });
  }

  const data: Payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  const requiredKeys: (keyof Payload)[] = [
    'name', 'email', 'facebook', 'position',
    'commissionTarget', 'topRevenueMonth', 'closingExperience', 'realEstateExperience',
  ];
  const missing = requiredKeys.filter((k) => !(data[k] || '').toString().trim());
  if (missing.length) {
    return res.status(400).json({ ok: false, error: `Missing required fields: ${missing.join(', ')}` });
  }

  const rows = FIELDS.map(([key, label]) => {
    const val = (data[key] || '').toString().trim();
    return `<tr><td style="border:1px solid #ddd;padding:6px"><strong>${label}</strong></td>` +
      `<td style="border:1px solid #ddd;padding:6px;white-space:pre-wrap">${escapeHtml(val)}</td></tr>`;
  }).join('');

  const html =
    `<h2>New Real Estate Applicant</h2>` +
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows}</table>`;

  // Best-effort: append to a Google Sheet via an Apps Script web app (if configured).
  // Never block/fail the submission on a Sheets error — email is the source of truth.
  let sheetOk = false;
  if (process.env.GSHEET_WEBHOOK_URL) {
    try {
      const sr = await fetch(process.env.GSHEET_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      sheetOk = sr.ok;
    } catch {
      sheetOk = false;
    }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: data.email,
      subject: `New Real Estate Applicant: ${data.name} (${data.position || 'No position'})`,
      html,
    });
    if (error) {
      return res.status(502).json({ ok: false, error: error.message });
    }
    return res.status(200).json({ ok: true, sheet: sheetOk });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
