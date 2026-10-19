/**
 * jtylerray.com/research → a row per response in the bound Google Sheet.
 *
 * This is the research record, and it is the only sink that takes every
 * submission. A reader who picks "Nothing, I was just answering the questions"
 * never reaches the CRM, by design — those are the candid answers about what
 * something cost and what was already tried, and they live here or nowhere.
 *
 * Deliberately a separate script from apply-sheet.gs, on its own variable.
 * That one writes applicant columns and ignores the rest of the payload, so
 * pointing the research form at it would append a row of blanks to the hiring
 * sheet for every response.
 *
 * SETUP (one time):
 *  1. Create the Google Sheet you want responses in, or open the one you
 *     already use — this writes to a tab called "Research" and creates it on
 *     the first response, so it can share a spreadsheet with anything else.
 *  2. Extensions → Apps Script. If a script is already bound to this
 *     spreadsheet, add a new file rather than replacing the existing one, and
 *     rename this doPost (Apps Script allows only one function of a name per
 *     project). Simplest is a brand-new spreadsheet.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as: Me
 *       Who has access: Anyone
 *     Deploy, authorize, and copy the Web app URL (it ends in /exec).
 *  4. In Vercel → jtylerray.com → Settings → Environment Variables, set
 *     GSHEET_RESEARCH_URL to that /exec URL, for Production and Preview.
 *  5. Redeploy the site so the function picks the variable up.
 *
 * Changing the deployment later: Deploy → Manage deployments → edit the
 * existing one → New version. A brand-new deployment gets a new URL, which
 * means updating GSHEET_RESEARCH_URL too.
 */

const TAB = 'Research';

/** column order, and the key each one reads from the posted payload */
const COLUMNS = [
  ['Submitted At', 'submittedAt'],
  ['Instagram', 'instagram'],
  ['Contact ID', 'ref'],
  ['Came From', 'utmSource'],
  ['Name', 'name'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['Sells', 'sells'],
  ['Worst Problem', 'topProblem'],
  ['All Problems, Ranked', 'problems'],
  ['Something Else', 'problemsOther'],
  ['How Long', 'duration'],
  ['What It Has Cost', 'cost'],
  ['Spent Money', 'spend'],
  ['What Happened', 'happened'],
  ['Goes To', 'sources'],
  ['Where They Are', 'intent'],
];

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(TAB) || book.insertSheet(TAB);

    // the header row is written once, on the first response, so a fresh sheet
    // needs no preparation beyond existing
    if (sheet.getLastRow() === 0) {
      const heads = COLUMNS.map(function (c) { return c[0]; });
      sheet.appendRow(heads);
      sheet.getRange(1, 1, 1, heads.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const values = COLUMNS.map(function (c) { return data[c[1]] || ''; });

    /* Everything the reader typed is written as text, and it has to be
       formatted that way BEFORE the value lands. Sheets parses a cell opening
       with + = - or @ as a formula, so a phone number arrives as #ERROR! and
       an answer that opens with a dash would go the same way. api/research.ts
       already sanitises on the way out; this is the belt to that braces, so a
       deployment running an older handler still writes clean rows.

       Column A is left alone. The timestamp is ours, not theirs, and it is the
       one column worth having as a real value to sort on. */
    const row = sheet.getLastRow() + 1;
    sheet.getRange(row, 2, 1, COLUMNS.length - 1).setNumberFormat('@');
    sheet.getRange(row, 1, 1, COLUMNS.length).setValues([values]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
