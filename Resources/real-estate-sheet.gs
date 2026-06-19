/**
 * Appends each Real Estate application as a row in the bound Google Sheet.
 * (Email is handled separately by Resend — this script only logs to the Sheet.)
 *
 * SETUP (one time):
 * 1. Create / open the Google Sheet you want applicants in.
 * 2. Extensions -> Apps Script. Replace the default code with this entire file.
 * 3. Deploy -> New deployment -> type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Deploy, authorize, and COPY the Web app URL (ends in /exec).
 * 4. Give that /exec URL to Claude -> it gets set as GSHEET_WEBHOOK_URL in Vercel.
 */

const HEADERS = [
  'Submitted At', 'Source', 'Name', 'Email', 'Facebook', 'Position',
  'Monthly Commission Target', 'Top Revenue Month',
  'Closing Experience', 'Real Estate Experience', 'AI Experience', 'Industry Experience',
  'Loom URL', 'Anything Else',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
    }

    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.source || 'real-estate',
      data.name || '',
      data.email || '',
      data.facebook || '',
      data.position || '',
      data.commissionTarget || '',
      data.topRevenueMonth || '',
      data.closingExperience || '',
      data.realEstateExperience || '',
      data.aiExperience || '',
      Array.isArray(data.experience) ? data.experience.join(', ') : (data.experience || ''),
      data.loomUrl || '',
      data.anythingElse || '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
