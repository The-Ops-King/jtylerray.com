/**
 * jtylerray.com/apply → a row per application in the bound Google Sheet.
 *
 * This script appends the row, and it is the record. Only applications that
 * met the criteria reach it: api/apply.ts turns the rest away and writes
 * nothing, so every row here is somebody worth reading.
 *
 * It also sends the daily digest. There is no email per application any more.
 * Run installDigest once and one message a day lists everyone who applied and
 * qualified since the last one. See the bottom of this file.
 *
 * The formula guard below is belt and braces. api/apply.ts already sanitises
 * every applicant-typed value on the way out, so a deployment still running an
 * older copy of this file is fine — this only matters if that handler ever
 * stops doing it.
 *
 * SETUP (one time):
 *  1. Create the Google Sheet you want applicants in — name it whatever you
 *     like; this writes to the first tab.
 *  2. Extensions → Apps Script. Replace the default code with this whole file.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as: Me
 *       Who has access: Anyone
 *     Deploy, authorize, and copy the Web app URL (it ends in /exec).
 *  4. In Vercel → jtylerray.com → Settings → Environment Variables, set
 *     GSHEET_WEBHOOK_URL to that /exec URL, for Production and Preview.
 *  5. Redeploy the site so the function picks the variable up.
 *
 * Changing the deployment later: Deploy → Manage deployments → edit the
 * existing one → New version. A brand-new deployment gets a new URL, which
 * means updating GSHEET_WEBHOOK_URL too.
 */

/* Role is last, not second. The columns are positional and this script has
   already written rows without it, so inserting it where it reads best would
   have shifted every one of them by a column. */
const HEADERS = [
  'Submitted At',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Facebook',
  'Intro Video',
  'Experience',
  'Role',
  'Years Closing',
  'On An Offer Now',
  'B2B Experience',
  'Call Recording',
  'Call Date',
];

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // the header row is written once, on the first application, so a fresh
    // sheet needs no preparation beyond existing
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else if (sheet.getLastColumn() < HEADERS.length) {
      // a sheet that predates a column gets the heading written in, so the
      // first application of the new kind does not land under a blank one
      const from = sheet.getLastColumn() + 1;
      const added = HEADERS.slice(from - 1);
      sheet.getRange(1, from, 1, added.length).setValues([added]).setFontWeight('bold');
    }

    const values = [
      data.submittedAt || new Date().toISOString(),
      data.firstName || '',
      data.lastName || '',
      data.email || '',
      data.phone || '',
      data.facebook || '',
      data.videoUrl || '',
      // one box on the form, one cell here — the applicant's own words
      data.experience || '',
      data.role || '',
      data.years || '',
      data.onOffer || '',
      data.b2b ? 'Yes' : '',
      data.callRecording || '',
      data.callDate || '',
    ];

    // Everything an applicant typed is written as text, and it has to be
    // formatted that way BEFORE the value lands. Sheets parses a cell that
    // opens with + = - or @ as a formula, so "+1 480-516-3213" arrived as
    // #ERROR! and an experience box that opened with a dash would have gone
    // the same way. The timestamp is left alone — column A is ours, not
    // theirs, and it is the one column worth having as a real value.
    const row = sheet.getLastRow() + 1;
    const rest = HEADERS.length - 1;
    sheet.getRange(row, 2, 1, rest).setNumberFormat('@');
    sheet.getRange(row, 1, 1, HEADERS.length).setValues([values]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   The daily digest

   One message a day holding everyone who applied and qualified since the
   last one, instead of an email per application. Applications that did not
   meet the criteria never reach this sheet, so everything in here is worth
   the minute it takes to read.

   SETUP (once): Run > installDigest. Authorise when asked. That is all.
   Change DIGEST_HOUR first if 8am is wrong; it is the hour in the
   spreadsheet's own time zone (File > Settings).

   Run digestNow any time to send one immediately, for a new day or to see
   what it looks like. Run uninstallDigest to stop it.
   ═══════════════════════════════════════════════════════════════════ */

const DIGEST_HOUR = 8;
const DIGEST_TO = 'jt@jtylerray.com';

/** Which columns the digest lists, and in what order. A link is a link; the
 *  long experience box is left out, because a digest nobody finishes is the
 *  thing the per-application email was already failing at. */
const DIGEST_COLUMNS = [
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Years Closing',
  'On An Offer Now',
  'Call Recording',
  'Call Date',
  'Intro Video',
];

function installDigest() {
  uninstallDigest();
  ScriptApp.newTrigger('sendDigest')
    .timeBased()
    .atHour(DIGEST_HOUR)
    .everyDays(1)
    .inTimezone(SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone())
    .create();
  Logger.log('Installed. One digest a day, around ' + DIGEST_HOUR + ':00.');
}

function uninstallDigest() {
  const t = ScriptApp.getProjectTriggers();
  for (let i = 0; i < t.length; i++) {
    if (t[i].getHandlerFunction() === 'sendDigest') ScriptApp.deleteTrigger(t[i]);
  }
}

/** send one now, whatever the schedule says */
function digestNow() {
  Logger.log(sendDigest());
}

function sendDigest() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const rows = sheet.getDataRange().getDisplayValues();
  if (rows.length < 2) return 'Nothing in the sheet yet.';

  const head = rows[0];
  const stamp = head.indexOf('Submitted At');

  /* Since the last digest, not since midnight: a trigger that slips an hour,
     or a day it could not run, would otherwise drop those applications out of
     every digest there will ever be. */
  const props = PropertiesService.getScriptProperties();
  const last = Number(props.getProperty('DIGEST_LAST') || 0);
  const since = last || Date.now() - 24 * 3600 * 1000;

  const fresh = [];
  for (let r = 1; r < rows.length; r++) {
    const when = Date.parse(rows[r][stamp]);
    if (!isNaN(when) && when > since) fresh.push(rows[r]);
  }

  // the watermark moves whether or not anyone applied, so a quiet day does
  // not make the next digest a week long
  props.setProperty('DIGEST_LAST', String(Date.now()));

  if (!fresh.length) return 'Nobody new since the last digest. Nothing sent.';

  const cols = DIGEST_COLUMNS.map(function (name) {
    return { name: name, at: head.indexOf(name) };
  }).filter(function (c) {
    return c.at !== -1;
  });

  let html =
    '<p>' + fresh.length + ' qualified ' +
    (fresh.length === 1 ? 'application' : 'applications') +
    ' since the last digest.</p>';

  for (let i = 0; i < fresh.length; i++) {
    const row = fresh[i];
    html += '<h3 style="margin:22px 0 6px">' + esc(row[head.indexOf('First Name')]) + ' ' +
      esc(row[head.indexOf('Last Name')]) + '</h3>';
    html += '<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">';
    for (let c = 0; c < cols.length; c++) {
      const value = row[cols[c].at];
      if (!value) continue;
      html += '<tr><td style="border:1px solid #ddd;padding:5px 8px"><strong>' +
        esc(cols[c].name) + '</strong></td><td style="border:1px solid #ddd;padding:5px 8px">' +
        (/^https?:\/\//.test(value)
          ? '<a href="' + esc(value) + '">' + esc(value) + '</a>'
          : esc(value)) +
        '</td></tr>';
    }
    html += '</table>';
  }

  html += '<p style="margin-top:24px"><a href="' +
    SpreadsheetApp.getActiveSpreadsheet().getUrl() +
    '">Open the sheet</a> for the full answers.</p>';

  MailApp.sendEmail({
    to: DIGEST_TO,
    subject: fresh.length + ' qualified applicant' + (fresh.length === 1 ? '' : 's'),
    htmlBody: html,
  });

  return 'Sent ' + fresh.length + '.';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
