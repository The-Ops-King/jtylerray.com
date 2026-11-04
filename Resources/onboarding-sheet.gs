/**
 * jtylerray.com/client-onboarding → one row per client in the bound Google
 * Sheet, updated in place by onboarding id.
 *
 * The record itself lives in Upstash Redis (api/onboarding.ts). This sheet is
 * the at-a-glance view: who started, how far they are, what is still red. It
 * is written on start, on submit, and at most every five minutes while the
 * client works.
 *
 * SETUP (one time):
 *  1. Create a NEW Google Sheet for onboarding (not the hiring sheet).
 *  2. Extensions → Apps Script. Replace the default code with this file.
 *  3. Deploy → New deployment → Web app.
 *       Execute as: Me
 *       Who has access: Anyone      ← not "Anyone with Google account" and
 *                                     not "Anyone within jtylerray.com"; a
 *                                     Vercel function has no Google login
 *  4. Copy the /exec URL. It must be script.google.com/macros/s/…/exec, with
 *     no /a/<domain>/ in it (that one is domain-scoped and 401s forever).
 *  5. Vercel → jtylerray.com → Settings → Environment Variables:
 *     ONBOARDING_SHEET_WEBHOOK_URL = that URL, Production and Preview.
 *  6. Redeploy.
 *
 * UPDATING this script later: Deploy → Manage deployments → pencil on the
 * existing deployment → Version: New version → Deploy. That keeps the same
 * /exec URL. "New deployment" would make a new URL and the env var would
 * need changing.
 */

const HEADERS = [
  'ID',
  'Status',
  'Progress',
  'Red Count',
  'Red Items',
  'Company',
  'Website',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Link',
  'Started',
  'Updated',
  'Submitted',
  'All Items',
  // part 2, appended so rows written before it keep their columns
  'Lead Sources',
  'Setting',
  'After Booking',
  'Offers',
  'Fulfillment',
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!d.id) throw new Error('missing id');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else if (sheet.getLastColumn() < HEADERS.length) {
      // a sheet made before a column existed gets the new headings written in
      const from = sheet.getLastColumn() + 1;
      const added = HEADERS.slice(from - 1);
      sheet.getRange(1, from, 1, added.length).setValues([added]).setFontWeight('bold');
    }

    const values = [
      d.id,
      d.status || '',
      d.progress || '',
      d.redCount || 0,
      d.red || '',
      d.company || '',
      d.website || '',
      d.firstName || '',
      d.lastName || '',
      d.email || '',
      d.phone || '',
      d.link || '',
      d.createdAt || '',
      d.updatedAt || '',
      d.submittedAt || '',
      d.items || '',
      d.leadSources || '',
      d.setting || '',
      d.booked || '',
      d.offers || '',
      d.fulfillment || '',
    ];

    // find the client's row by id, or add one
    const last = sheet.getLastRow();
    let row = 0;
    if (last > 1) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (ids[i][0] === d.id) {
          row = i + 2;
          break;
        }
      }
    }
    if (!row) row = last + 1;

    // client-typed text as text, so "+1 480…" is not read as a formula
    sheet.getRange(row, 1, 1, HEADERS.length).setNumberFormat('@');
    sheet.getRange(row, 1, 1, HEADERS.length).setValues([values]);

    // red rows read red at a glance
    const red = Number(d.redCount) > 0;
    sheet.getRange(row, 1, 1, HEADERS.length).setBackground(red ? '#fbe3df' : null);

    return out({ ok: true, row: row });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(
    ContentService.MimeType.JSON
  );
}
