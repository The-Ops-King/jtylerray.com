/**
 * Google Form -> GoHighLevel, on every submission.
 *
 * Lives on the form itself, not the sheet: a form-bound script gets the
 * question titles with the answers, so the mapping below reads like the form
 * instead of like column letters.
 *
 * WHAT IT WRITES
 *   A contact, upserted on email or phone, carrying:
 *     - tags for every operational issue they ticked, the one they said costs
 *       the most, whether they are looking for help, and whether they sell a
 *       high ticket product
 *     - a note holding the whole response, so nothing needs a custom field
 *
 *   Tags are what GHL smart lists filter on, so the answers you will want to
 *   segment by are tags and the prose is a note. Custom fields would mean
 *   building eleven of them by hand before a single response could land.
 *
 * WHO IT SKIPS
 *   Anyone who did not leave an email or a phone. GHL upserts on one of those
 *   two and has nothing to match an Instagram handle against, so a handle-only
 *   response would either fail or pile up duplicates. Those stay in the
 *   responses sheet, which is where the research lives anyway.
 *
 *   Set CREATE_WITHOUT_CONTACT to true to put them in GHL regardless, named by
 *   their handle. Be deliberate about it: those contacts cannot be deduped, so
 *   a second submission makes a second contact.
 *
 * SETUP (once)
 *  1. Open the form, ⋮ (top right) > Script editor, paste this whole file in.
 *  2. Project Settings (gear, left) > Script Properties > Add script property:
 *       GHL_PIT          your Private Integration Token
 *       GHL_LOCATION_ID  the sub-account id
 *       GHL_USER_ID      optional, the user notes are attributed to
 *     Put the token here rather than in the code. Script properties are not
 *     part of the file, so the token does not travel with a copy of it.
 *  3. Run > install. Authorise when asked.
 *  4. Run > test. It sends one fake submission. Check it landed in GHL, then
 *     delete the test contact.
 *
 * The PIT needs contacts.write and contacts.readonly. The note also needs
 * whatever your account calls notes write access; without it the contact still
 * lands and only the note is missed.
 *
 * If a call to GHL fails the function throws, which makes Apps Script email
 * you about it. A submission that silently fails to reach the CRM is worse
 * than one that complains.
 */

var API = 'https://services.leadconnectorhq.com';
var VERSION = '2021-07-28';

/** put handle-only responses in GHL too. Read the note above before enabling. */
var CREATE_WITHOUT_CONTACT = false;

/**
 * Which question feeds what. Matched on a distinctive fragment rather than the
 * whole title, so editing the wording of a question does not quietly stop the
 * field from being read.
 */
var FIELDS = [
  { key: 'handle', match: 'instagram' },
  { key: 'highTicket', match: 'high ticket' },
  { key: 'issues', match: 'operational issues' },
  { key: 'worst', match: 'cost you the most' },
  { key: 'howLong', match: 'how long have' },
  { key: 'cost', match: 'how much would you say' },
  { key: 'spent', match: 'spent money' },
  { key: 'howItWent', match: 'how did that go' },
  { key: 'where', match: 'where do you typically' },
  { key: 'looking', match: 'actively looking' },
  { key: 'contact', match: 'best place to contact' },
];

/**
 * Short names for the issues, matched on a fragment of the option text.
 *
 * Slugifying the option itself gave tags like
 * issue-takes-too-long-to-contact-new-leads-speed-to-lea, cut mid word, and
 * baked a typo in one of the options into the CRM forever. These are what you
 * will be reading in a filter list, so they are named rather than generated,
 * and a fragment match means rewording an option does not orphan its tag.
 *
 * Anything unmatched, including Other, falls back to the slug of what they
 * wrote.
 */
var ISSUE_TAGS = [
  { match: 'too long to contact', tag: 'speed-to-lead' },
  { match: 'crm is messy', tag: 'messy-crm' },
  { match: 'low quality notes', tag: 'rep-notes' },
  { match: 'follow up systems', tag: 'follow-up' },
  { match: 'how reps are performing', tag: 'rep-visibility' },
  { match: 'feelings rather than data', tag: 'no-data' },
  { match: 'trust numbers', tag: 'reporting' },
  { match: 'company onboarding', tag: 'onboarding' },
  { match: 'many software', tag: 'tool-sprawl' },
  { match: 'poor processes', tag: 'processes' },
];

var INTENT_TAGS = [
  { match: 'actively looking', tag: 'research-actively-looking' },
  { match: 'might be open', tag: 'research-open-to-it' },
  { match: 'not right now', tag: 'research-not-now' },
];

/* ── setup ──────────────────────────────────────────────────────────── */

function install() {
  var form = FormApp.getActiveForm();
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'onSubmit') ScriptApp.deleteTrigger(existing[i]);
  }
  ScriptApp.newTrigger('onSubmit').forForm(form).onFormSubmit().create();
  Logger.log('Installed. Every submission from now on goes to GHL.');
}

function uninstall() {
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++) {
    if (t[i].getHandlerFunction() === 'onSubmit') ScriptApp.deleteTrigger(t[i]);
  }
  Logger.log('Uninstalled. Submissions still land in the sheet, just not in GHL.');
}

/* ── the trigger ────────────────────────────────────────────────────── */

function onSubmit(e) {
  var answers = read(e.response);
  var result = send(answers);
  Logger.log(result);
}

/** Pulls the answers off a FormResponse and onto named keys. */
function read(response) {
  var out = {};
  var items = response.getItemResponses();
  for (var i = 0; i < items.length; i++) {
    var title = items[i].getItem().getTitle().toLowerCase();
    var value = items[i].getResponse();
    for (var f = 0; f < FIELDS.length; f++) {
      if (title.indexOf(FIELDS[f].match) !== -1) {
        out[FIELDS[f].key] = value;
        break;
      }
    }
  }
  return out;
}

/* ── GHL ────────────────────────────────────────────────────────────── */

function send(a) {
  var props = PropertiesService.getScriptProperties();
  var pit = props.getProperty('GHL_PIT');
  var location = props.getProperty('GHL_LOCATION_ID');
  if (!pit || !location) {
    throw new Error('GHL_PIT or GHL_LOCATION_ID is not set in Script Properties.');
  }

  var reach = parseContact(a.contact);
  if (!reach.email && !reach.phone && !CREATE_WITHOUT_CONTACT) {
    return 'No email or phone given, so nothing to upsert on. Left in the sheet.';
  }

  var payload = {
    locationId: location,
    tags: tagsFor(a),
    source: 'Ops research form',
  };
  if (reach.email) payload.email = reach.email;
  if (reach.phone) payload.phone = reach.phone;

  /* The handle is the only name available. GHL shows a contact by name, and a
     row called "No Name" is not findable three weeks later. */
  var handle = String(a.handle || '').replace(/^@+/, '').trim();
  if (handle) {
    payload.firstName = '@' + handle;
    payload.customField = { instagram: handle };
  }

  var res = call('POST', API + '/contacts/upsert', payload, pit);
  var body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300) {
    throw new Error('GHL upsert failed (' + res.getResponseCode() + '): ' + res.getContentText());
  }

  var contact = body.contact || body;
  var id = contact.id || contact._id;
  if (!id) return 'Contact written, but GHL returned no id, so no note was added.';

  /* The note is everything they typed, in one place, so none of it depends on
     a custom field existing first. */
  var note = call('POST', API + '/contacts/' + id + '/notes', { body: noteFor(a), userId: props.getProperty('GHL_USER_ID') || undefined }, pit);
  var noteOk = note.getResponseCode() < 300;

  return 'Contact ' + id + ' upserted. Note ' + (noteOk ? 'added.' : 'failed: ' + note.getContentText());
}

function call(method, url, payload, pit) {
  return UrlFetchApp.fetch(url, {
    method: method,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + pit, Version: VERSION, Accept: 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}

/* ── turning answers into tags ──────────────────────────────────────── */

function tagsFor(a) {
  var tags = ['research-respondent'];

  var issues = [].concat(a.issues || []);
  for (var i = 0; i < issues.length; i++) {
    var t = issueTag(issues[i]);
    if (t && t !== 'none-of-these') tags.push('issue-' + t);
  }
  if (a.worst) {
    var w = issueTag(a.worst);
    if (w && w !== 'none-of-these') tags.push('worst-' + w);
  }

  var looking = String(a.looking || '').toLowerCase();
  for (var j = 0; j < INTENT_TAGS.length; j++) {
    if (looking.indexOf(INTENT_TAGS[j].match) !== -1) tags.push(INTENT_TAGS[j].tag);
  }

  var ht = String(a.highTicket || '').toLowerCase();
  if (ht.indexOf('yes') === 0) tags.push('high-ticket-yes');
  else if (ht.indexOf('no') === 0) tags.push('high-ticket-no');

  return tags;
}

/** the short name for an option, or the slug of it if it is not one of ours */
function issueTag(text) {
  var low = String(text).toLowerCase();
  for (var i = 0; i < ISSUE_TAGS.length; i++) {
    if (low.indexOf(ISSUE_TAGS[i].match) !== -1) return ISSUE_TAGS[i].tag;
  }
  return slug(text);
}

/** lowercase words joined by hyphens, cut at a word so a long answer does not
 *  become a tag ending mid-syllable */
function slug(s) {
  var out = String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (out.length <= 40) return out;
  var cut = out.slice(0, 40);
  var lastDash = cut.lastIndexOf('-');
  return (lastDash > 12 ? cut.slice(0, lastDash) : cut).replace(/-+$/, '');
}

function noteFor(a) {
  var lines = [
    'Ops research form',
    '',
    'Instagram: ' + (a.handle || '-'),
    'Sells high ticket: ' + (a.highTicket || '-'),
    '',
    'Issues: ' + [].concat(a.issues || []).join('; '),
    'Costs the most: ' + (a.worst || '-'),
    'How long: ' + (a.howLong || '-'),
    'What it has cost: ' + (a.cost || '-'),
    '',
    'Spent money: ' + [].concat(a.spent || []).join('; '),
    'How that went: ' + (a.howItWent || '-'),
    'Goes to: ' + (a.where || '-'),
    '',
    'Looking for help: ' + (a.looking || '-'),
    'Best place to reach them: ' + (a.contact || '-'),
  ];
  return lines.join('\n');
}

/**
 * The contact question is a free text box, so people answer it with an email,
 * a phone number, a handle, or a sentence. This takes whichever of the first
 * two it can find and ignores the rest.
 */
function parseContact(raw) {
  var s = String(raw || '');
  var email = s.match(/[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}/);
  var phone = s.match(/\+?\d[\d\s().\-]{7,}\d/);
  return {
    email: email ? email[0].toLowerCase() : '',
    phone: phone ? phone[0].replace(/[^\d+]/g, '') : '',
  };
}

/* ── test ───────────────────────────────────────────────────────────── */

/** One fake submission, so the wiring can be checked before real answers
 *  depend on it. Delete the contact it makes. */
function test() {
  var result = send({
    handle: 'testhandle',
    highTicket: 'Yes',
    issues: ['CRM is messy and out of date', 'No good follow up systems for hot prospects'],
    worst: 'CRM is messy and out of date',
    howLong: 'A long time',
    cost: 'no idea, a lot',
    spent: ["Yes, I've bought software"],
    howItWent: 'nobody used it',
    where: 'youtube and a facebook group',
    looking: 'Yes, actively looking to solve the problem',
    contact: 'test.person@example.com',
  });
  Logger.log(result);
}
