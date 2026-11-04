/**
 * jtylerray.com/apply → a row per application, and one digest a day.
 *
 * Applications land on their own tab, named below. Only ones that met the
 * criteria ever arrive: api/apply.ts turns the rest away and writes nothing,
 * so every row here is somebody worth reading.
 *
 * There is no email per application. Run installDigest once and one message a
 * day lists everyone who applied and qualified since the last one.
 *
 * ── SETUP ──────────────────────────────────────────────────────────────
 *  1. Open the applications spreadsheet. Extensions > Apps Script.
 *  2. Replace the whole file with this one.
 *  3. Deploy > Manage deployments > edit the existing one > New version.
 *     A brand new deployment gets a new URL, which would mean updating
 *     GSHEET_WEBHOOK_URL in Vercel too.
 *  4. Run > installDigest. Authorise when asked. Change DIGEST_HOUR first if
 *     8am is wrong; it is the hour in the spreadsheet's own time zone
 *     (File > Settings).
 *
 * The tab is created on the first application. Nothing needs making by hand.
 *
 * ── A NEW ROLE LATER ───────────────────────────────────────────────────
 * Change TAB. The old role's tab is left exactly as it is, with its own
 * columns and its own history, and the new one starts clean. That is the
 * whole reason the role gets a tab rather than five more columns on the end
 * of the last one.
 */

/** Which tab this role's applications go to, and which one the digest reads. */
const TAB = 'B2B Closer';

/**
 * The columns, in order. Changing this order is safe before the first
 * application and not after: the values are written positionally, so moving a
 * column moves every value under it without moving the data already there.
 * Adding one to the end is always safe, and the header gets written in.
 */
const COLUMNS = [
  ['Submitted At', 'submittedAt'],
  ['First Name', 'firstName'],
  ['Last Name', 'lastName'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Years Closing', 'years'],
  ['B2B Experience', 'b2b'],
  ['On An Offer Now', 'onOffer'],
  ['Call Recording', 'callRecording'],
  ['Call Date', 'callDate'],
  ['Intro Video', 'videoUrl'],
  ['Facebook', 'facebook'],
  ['Experience', 'experience'],
  ['Role', 'role'],
];

/* ═══════════════════════════════════════════════════════════════════
   Taking an application
   ═══════════════════════════════════════════════════════════════════ */

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(TAB) || book.insertSheet(TAB);
    const heads = COLUMNS.map(function (c) { return c[0]; });

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(heads);
      sheet.getRange(1, 1, 1, heads.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else if (sheet.getLastColumn() < heads.length) {
      // a tab that predates a column gets the heading written in, so the first
      // application of the new shape does not land under a blank one
      const from = sheet.getLastColumn() + 1;
      const added = heads.slice(from - 1);
      sheet.getRange(1, from, 1, added.length).setValues([added]).setFontWeight('bold');
    }

    const values = COLUMNS.map(function (c) {
      const v = data[c[1]];
      // the checkbox posts "yes" or nothing; the sheet reads better as Yes
      if (c[1] === 'b2b') return v ? 'Yes' : '';
      return v || '';
    });
    values[0] = data.submittedAt || new Date().toISOString();

    /* Everything an applicant typed is written as text, and it has to be
       formatted that way BEFORE the value lands. Sheets parses a cell opening
       with + = - or @ as a formula, so "+1 480 516 3213" arrived as #ERROR!
       and an experience box opening with a dash would have gone the same way.
       api/apply.ts already sanitises on the way out; this is the belt to that
       braces, so a deployment running an older handler still writes clean
       rows.

       Column A is left alone. The timestamp is ours, not theirs, and it is
       the one column worth having as a real value to sort and filter on. */
    const row = sheet.getLastRow() + 1;
    sheet.getRange(row, 2, 1, COLUMNS.length - 1).setNumberFormat('@');
    sheet.getRange(row, 1, 1, COLUMNS.length).setValues([values]);

    return ok({ ok: true });
  } catch (err) {
    return ok({ ok: false, error: String(err) });
  }
}

function ok(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/* ═══════════════════════════════════════════════════════════════════
   The daily digest

   One message a day holding everyone who applied and qualified since the
   last one, instead of an email per application. Applications that did not
   meet the criteria never reach this tab, so everything in here is worth
   the minute it takes to read.

   Run digestNow any time to send one immediately. Run uninstallDigest to
   stop it.
   ═══════════════════════════════════════════════════════════════════ */

const DIGEST_HOUR = 8;
const DIGEST_TO = 'jt@jtylerray.com';

/** Which columns the digest lists. The long experience box is left out: a
 *  digest nobody finishes is what the per-application email was already
 *  failing at. It is one click away in the sheet. */
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
  Logger.log('Installed. One digest a day, around ' + DIGEST_HOUR + ':00, reading "' + TAB + '".');
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
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheetByName(TAB);
  if (!sheet) return 'No "' + TAB + '" tab yet. Nothing sent.';

  const range = sheet.getDataRange();
  const rows = range.getDisplayValues();
  if (rows.length < 2) return 'No applications yet. Nothing sent.';

  const head = rows[0];
  const stamp = head.indexOf('Submitted At');
  if (stamp === -1) return 'No "Submitted At" column. Nothing sent.';

  /* The timestamps are read as values, not as what the cell displays. Column A
     is the one column written as a real value, so Sheets parses it and renders
     it in the spreadsheet's own locale: Date.parse on "04/11/2026" is a guess
     at which number is the month. getValues gives the Date itself. */
  const stamps = range.getValues();

  /* Since the last digest, not since midnight: a trigger that slips an hour,
     or a day it could not run, would otherwise drop those applications out of
     every digest there will ever be. The watermark is per tab, so changing
     TAB for a new role does not make its first digest start mid-history. */
  const props = PropertiesService.getScriptProperties();
  const key = 'DIGEST_LAST::' + TAB;
  const last = Number(props.getProperty(key) || 0);
  const since = last || Date.now() - 24 * 3600 * 1000;

  const fresh = [];
  for (let r = 1; r < rows.length; r++) {
    const when = toMillis(stamps[r][stamp]);
    if (when && when > since) fresh.push(rows[r]);
  }

  // the watermark moves whether or not anyone applied, so a quiet day does not
  // make the next digest a week long
  props.setProperty(key, String(Date.now()));

  if (!fresh.length) return 'Nobody new since the last digest. Nothing sent.';

  const cols = DIGEST_COLUMNS.map(function (name) {
    return { name: name, at: head.indexOf(name) };
  }).filter(function (c) {
    return c.at !== -1;
  });

  const first = head.indexOf('First Name');
  const last_ = head.indexOf('Last Name');

  let html =
    '<p>' + fresh.length + ' qualified ' +
    (fresh.length === 1 ? 'application' : 'applications') +
    ' since the last digest.</p>';

  for (let i = 0; i < fresh.length; i++) {
    const row = fresh[i];
    html += '<h3 style="margin:22px 0 6px">' +
      esc(row[first]) + ' ' + esc(row[last_]) + '</h3>';
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

  html += '<p style="margin-top:24px"><a href="' + book.getUrl() +
    '">Open the sheet</a> for the full answers.</p>';

  MailApp.sendEmail({
    to: DIGEST_TO,
    subject: fresh.length + ' qualified applicant' + (fresh.length === 1 ? '' : 's'),
    htmlBody: html,
  });

  return 'Sent ' + fresh.length + '.';
}

/** a cell Sheets parsed into a Date, or one it left as text */
function toMillis(cell) {
  if (cell instanceof Date) return cell.getTime();
  const t = Date.parse(String(cell));
  return isNaN(t) ? 0 : t;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
