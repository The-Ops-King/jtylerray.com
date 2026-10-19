import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

/**
 * POST /api/research — the market research form at jtylerray.com/research.
 *
 * Three sinks, in descending order of how much they matter:
 *
 *   The Sheet is the research record and takes every submission, including the
 *   anonymous ones. Those are the candid answers — people tell the truth about
 *   what something cost them when nobody is asking who they are — so the Sheet
 *   is the dataset, not a backup of the CRM.
 *
 *   The email is what makes a response arrive rather than wait to be noticed.
 *
 *   GoHighLevel takes the subset carrying an email, a phone or a contact id,
 *   because an upsert needs one of those to land on. An Instagram handle is not
 *   an identifier GHL can hold a contact by, so handle-only responses live in
 *   the Sheet alone and that is the correct outcome.
 *
 * Env: GSHEET_RESEARCH_URL, RESEND_API_KEY, RESEND_FROM, NOTIFY_EMAIL,
 * GHL_PIT, GHL_LOCATION_ID. Each sink skips itself when its own variable is
 * missing, so the form works before GHL is wired and keeps working if a
 * credential is rotated out.
 *
 * The Sheet gets its own variable rather than sharing GSHEET_WEBHOOK_URL with
 * the application form. That script writes applicant columns and ignores what
 * else is in the payload, so pointing this at it would append a row of mostly
 * blanks to the hiring sheet for every research response. See
 * Resources/research-sheet.gs for this one's script and setup.
 *
 * A submission succeeds if any sink took it. Losing research to a service
 * being down is the only outcome worth writing code against.
 */

const FROM = process.env.RESEND_FROM || 'Research <onboarding@resend.dev>';
const TO = process.env.NOTIFY_EMAIL || 'jt@jtylerray.com';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

/* ── what the form may say ──────────────────────────────────────────── */

/**
 * The option lists, duplicated from hero-lab/src/research/data.ts on purpose.
 * The API has no build step in common with the page, and the page is a client
 * that anyone can edit before it posts. Anything not on these lists is dropped
 * rather than stored, which is what keeps a crafted POST from writing its own
 * tags into the CRM.
 */
const PROBLEM_IDS = [
  'lead-ownership',
  'crm-junk',
  'speed-to-lead',
  'call-outcomes',
  'follow-up',
  'rep-numbers',
  'trust-reporting',
  'call-visibility',
  'commissions',
  'handoff',
  'one-person',
  'workarounds',
];

const INTENT_IDS = ['looking', 'open', 'content', 'nothing'];

const CHOICES: Record<string, string[]> = {
  team: ["None, it's me", '1–2', '3–5', '6–15', '15+'],
  duration: ['A few months', '6 to 12 months', '1 to 2 years', 'Longer than I want to admit'],
  cost: [
    'Deals we should have closed',
    'Hours every week',
    'Money spent patching it',
    'Trust in our own numbers',
    'Honestly, no idea',
  ],
  spend: ['No, not yet', 'Tried to fix it in-house', 'Bought software', 'Hired someone'],
  stuck: [
    'Knowing what to even ask for',
    'Picking the tool',
    'Actually building it',
    'Getting the team to use it',
    'Finding the time',
    'Paying for it',
  ],
};

/** the free-text boxes, and how much of each is kept. Generous for a person,
 *  closed for a script posting a megabyte into a spreadsheet. */
const TEXT_LIMIT: Record<string, number> = {
  sell: 300,
  problemsOther: 300,
  happened: 4000,
  sources: 500,
  name: 100,
  email: 200,
  phone: 60,
};

const HANDLE_OK = /^[A-Za-z0-9._]{1,30}$/;
const REF_OK = /^[A-Za-z0-9]{15,40}$/;
const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ── helpers ────────────────────────────────────────────────────────── */

const text = (v: unknown, max: number) => (v ?? '').toString().trim().slice(0, max);

/** keep the order the reader put them in, drop anything unrecognised, and drop
 *  duplicates so one id cannot be repeated into a hundred tags */
function allowList(v: unknown, allowed: string[]): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  return v
    .map((x) => (x ?? '').toString())
    .filter((x) => allowed.includes(x) && !seen.has(x) && seen.add(x));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Sheets reads a cell opening with = + - or @ as a formula. Same treatment as
 *  the application handler: + loses the prefix, the rest get pushed behind a
 *  space so a sentence that opens with a dash stays the sentence it was. */
function sheetSafe(value: unknown): string {
  const s = (value ?? '').toString().trim();
  if (s.startsWith('+')) return s.replace(/^\+\s*/, '');
  return /^[=\-@]/.test(s) ? ` ${s}` : s;
}

/* ── the handler ────────────────────────────────────────────────────── */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // the honeypot answers first, and answers 200 so a bot has nothing to tune
  // against
  if ((body.company || '').toString().trim()) {
    return res.status(200).json({ ok: true });
  }

  const handleRaw = (body.instagram ?? '').toString().trim().replace(/^@+/, '');
  const a = {
    sell: text(body.sell, TEXT_LIMIT.sell),
    team: CHOICES.team.includes(body.team) ? body.team : '',
    problems: allowList(body.problems, PROBLEM_IDS),
    problemsOther: text(body.problemsOther, TEXT_LIMIT.problemsOther),
    duration: CHOICES.duration.includes(body.duration) ? body.duration : '',
    cost: allowList(body.cost, CHOICES.cost),
    spend: allowList(body.spend, CHOICES.spend),
    happened: text(body.happened, TEXT_LIMIT.happened),
    stuck: allowList(body.stuck, CHOICES.stuck),
    sources: text(body.sources, TEXT_LIMIT.sources),
    intent: INTENT_IDS.includes(body.intent) ? body.intent : '',
    instagram: HANDLE_OK.test(handleRaw) ? handleRaw : '',
    ref: REF_OK.test((body.ref ?? '').toString().trim()) ? (body.ref ?? '').toString().trim() : '',
    name: text(body.name, TEXT_LIMIT.name),
    email: text(body.email, TEXT_LIMIT.email).toLowerCase(),
    phone: text(body.phone, TEXT_LIMIT.phone),
    source: text(body.source, 60),
    submittedAt: text(body.submittedAt, 40) || new Date().toISOString(),
  };

  if (a.email && !EMAIL_OK.test(a.email)) {
    return res.status(400).json({ ok: false, error: 'That email address looks wrong' });
  }

  // a row with no answers on it is not research
  if (!a.problems.length && !a.problemsOther && !a.sell) {
    return res.status(400).json({ ok: false, error: 'Nothing was answered' });
  }

  const top = a.problems[0] || '';
  const who = a.name || (a.instagram && `@${a.instagram}`) || a.email || 'anonymous';

  /* ── the sheet: every submission ─────────────────────────────────── */
  let sheetOk = false;
  let sheetError = 'GSHEET_RESEARCH_URL is not set';
  if (process.env.GSHEET_RESEARCH_URL) {
    try {
      const sr = await fetch(process.env.GSHEET_RESEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'research',
          submittedAt: a.submittedAt,
          instagram: a.instagram,
          ref: a.ref,
          utmSource: a.source,
          name: sheetSafe(a.name),
          email: sheetSafe(a.email),
          phone: sheetSafe(a.phone),
          sells: sheetSafe(a.sell),
          teamSize: a.team,
          topProblem: top,
          problems: a.problems.join(', '),
          problemsOther: sheetSafe(a.problemsOther),
          duration: a.duration,
          cost: a.cost.join(', '),
          spend: a.spend.join(', '),
          happened: sheetSafe(a.happened),
          stuck: a.stuck.join(', '),
          sources: sheetSafe(a.sources),
          intent: a.intent,
        }),
      });
      sheetOk = sr.ok;
      if (!sheetOk) sheetError = `Sheet responded ${sr.status}`;
    } catch (err) {
      sheetError = String(err);
    }
  }

  /* ── GoHighLevel: the ones it can hold ───────────────────────────── */
  const canUpsert = Boolean(a.email || a.phone || a.ref);
  let ghlOk = false;
  let ghlError = canUpsert ? 'GHL_PIT or GHL_LOCATION_ID is not set' : 'no email, phone or contact id';
  if (canUpsert && process.env.GHL_PIT && process.env.GHL_LOCATION_ID) {
    try {
      /* Tags carry the problems and the intent because tags are what a smart
         list filters on natively — "everyone whose worst problem is reporting
         they do not trust" should be four clicks, not a report. The scalar
         answers go to custom fields, where they are readable on the contact. */
      const tags = [
        'research-respondent',
        ...a.problems.map((p) => `problem-${p}`),
        ...(top ? [`top-${top}`] : []),
        ...(a.intent ? [`research-${a.intent}`] : []),
      ];

      const payload: Record<string, unknown> = {
        locationId: process.env.GHL_LOCATION_ID,
        tags,
        source: a.source ? `research (${a.source})` : 'research form',
        customFields: [
          ['research_sells', a.sell],
          ['research_team_size', a.team],
          ['research_top_problem', top],
          ['research_problems', a.problems.join(', ')],
          ['research_problems_other', a.problemsOther],
          ['research_duration', a.duration],
          ['research_cost', a.cost.join(', ')],
          ['research_spend', a.spend.join(', ')],
          ['research_happened', a.happened],
          ['research_stuck', a.stuck.join(', ')],
          ['research_sources', a.sources],
          ['research_intent', a.intent],
          ['research_instagram', a.instagram],
          ['research_submitted_at', a.submittedAt],
        ]
          .filter(([, v]) => v)
          .map(([key, field_value]) => ({ key, field_value })),
      };
      if (a.ref) payload.id = a.ref;
      if (a.name) payload.firstName = a.name;
      if (a.email) payload.email = a.email;
      if (a.phone) payload.phone = a.phone;

      const gr = await fetch(`${GHL_API}/contacts/upsert`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GHL_PIT}`,
          Version: GHL_VERSION,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      ghlOk = gr.ok;
      if (!ghlOk) ghlError = `GHL responded ${gr.status}: ${(await gr.text()).slice(0, 300)}`;
    } catch (err) {
      ghlError = String(err);
    }
  }

  /* ── the copy ────────────────────────────────────────────────────── */
  const ROWS: [string, string][] = [
    ['Who', who],
    ['Instagram', a.instagram ? `@${a.instagram}` : ''],
    ['Sells', a.sell],
    ['Touching a lead', a.team],
    ['Worst problem', top],
    ['All problems, ranked', a.problems.join(' → ')],
    ['Something else', a.problemsOther],
    ['How long', a.duration],
    ['What it costs', a.cost.join(', ')],
    ['Spent money', a.spend.join(', ')],
    ['What happened', a.happened],
    ['Would get stuck on', a.stuck.join(', ')],
    ['Goes to', a.sources],
    ['Where they are', a.intent],
    ['Email', a.email],
    ['Phone', a.phone],
    ['Came from', a.source || (a.instagram ? 'instagram link' : '')],
  ];

  const rows = ROWS.filter(([, v]) => v)
    .map(
      ([label, val]) =>
        `<tr><td style="border:1px solid #ddd;padding:6px;vertical-align:top"><strong>${label}</strong></td>` +
        `<td style="border:1px solid #ddd;padding:6px;white-space:pre-wrap">${escapeHtml(val)}</td></tr>`
    )
    .join('');

  const warn = [
    sheetOk ? '' : `Not written to the Sheet: ${sheetError}`,
    !canUpsert ? '' : ghlOk ? '' : `Not written to GHL: ${ghlError}`,
  ]
    .filter(Boolean)
    .map((w) => `<p style="color:#b00">${escapeHtml(w)}</p>`)
    .join('');

  const html =
    `<h2>Research response — ${escapeHtml(who)}</h2>` +
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${rows}</table>` +
    warn;

  let mailOk = false;
  let mailError = 'RESEND_API_KEY is not set';
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: FROM,
        to: TO,
        ...(a.email ? { replyTo: a.email } : {}),
        subject: `Research: ${who}${top ? ` — ${top}` : ''}`,
        html,
      });
      mailOk = !error;
      if (error) mailError = error.message;
    } catch (err) {
      mailError = String(err);
    }
  }

  if (!sheetOk && !mailOk && !ghlOk) {
    // every sink is down, so the reader is told rather than thanked for two
    // minutes that went nowhere
    return res
      .status(502)
      .json({ ok: false, error: `Could not record that (${sheetError}; ${mailError})` });
  }

  return res.status(200).json({ ok: true, sheet: sheetOk, email: mailOk, crm: ghlOk });
}
