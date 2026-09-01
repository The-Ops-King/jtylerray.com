/**
 * jtylerray.com/apply → a row per closer application in the bound Google Sheet.
 *
 * The email copy is Resend's job (api/apply.ts). This script only appends the
 * row, and it is the record: if this is not deployed, GSHEET_WEBHOOK_URL is
 * unset and applications live only in the inbox.
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

const HEADERS = [
  'Submitted At',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Facebook',
  'Intro Video',
  'Experience',
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
