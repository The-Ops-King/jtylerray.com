/**
 * Google Form -> GoHighLevel custom fields, on every submission.
 *
 * Lives on the form itself, not the sheet: a form-bound script gets the
 * question titles with the answers, so the mapping reads like the form
 * instead of like column letters.
 *
 * SETUP (once)
 *  1. Open the form, ⋮ (top right) > Script editor, paste this whole file in.
 *  2. Project Settings (gear, left) > Script Properties > add:
 *       GHL_PIT          your Private Integration Token
 *       GHL_LOCATION_ID  the sub-account id
 *     The token goes here rather than in the code, so it does not travel with
 *     a copy of the script.
 *  3. Run > listFields. It prints every custom field in your location, then a
 *     FIELD_MAP block matched to this form's questions by name.
 *  4. Read that block, fix anything it matched wrongly, and paste it over the
 *     FIELD_MAP below.
 *  5. Run > test. One fake submission. Check the contact in GHL, then delete
 *     it.
 *  6. Run > install. Every submission from then on writes to GHL.
 *
 * The PIT needs contacts.write, contacts.readonly and
 * locations/customFields.readonly (step 3 reads the field list).
 *
 * A failed call throws, which makes Apps Script email you. A response that
 * silently fails to reach the CRM is worse than one that complains.
 */

var API = 'https://services.leadconnectorhq.com';
var VERSION = '2021-07-28';

/**
 * Which answer goes in which custom field.
 *
 * `ghl` is the field's key or its id, whichever listFields printed. Leave an
 * entry blank to skip that answer, and delete an entry to stop sending it at
 * all. Nothing is written to a field that is not named here, so an answer with
 * no field beside it is dropped. The run log says which ones those were.
 */
var FIELD_MAP = [
  { key: 'handle', ghl: '' },      // Instagram handle
  { key: 'highTicket', ghl: '' },  // Do you sell a high ticket coaching product?
  { key: 'issues', ghl: '' },      // Which of these operational issues...
  { key: 'worst', ghl: '' },       // Of the issues you picked, which has cost you the most?
  { key: 'howLong', ghl: '' },     // How long have these been an issue?
  { key: 'cost', ghl: '' },        // How much would you say these issues have cost you?
  { key: 'spent', ghl: '' },       // Have you spent money trying to fix them?
  { key: 'howItWent', ghl: '' },   // How did that go?
  { key: 'where', ghl: '' },       // Where do you typically go to figure this out?
  { key: 'looking', ghl: '' },     // Are you actively looking for help?
  { key: 'contact', ghl: '' },     // ...best place to contact you
];

/**
 * Which question feeds which key. Matched on a distinctive fragment rather
 * than the whole title, so rewording a question does not quietly stop its
 * answer being read.
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
 * GHL has shipped both shapes for a custom field on upsert. If the test run
 * writes a contact whose fields are all empty, change this to 'value' and run
 * it again. Nothing else needs touching.
 */
var VALUE_KEY = 'field_value';

/** Put responses with no email or phone into GHL too. Off, because GHL upserts
 *  on email or phone and has nothing to match an Instagram handle against: a
 *  handle-only response cannot be deduped, so a second submission would make a
 *  second contact. They stay in the responses sheet either way. */
var CREATE_WITHOUT_CONTACT = false;

/* ── setup ──────────────────────────────────────────────────────────── */

function install() {
  var mapped = 0;
  for (var i = 0; i < FIELD_MAP.length; i++) if (FIELD_MAP[i].ghl) mapped++;
  if (!mapped) throw new Error('FIELD_MAP is empty. Run listFields first and paste the block it prints.');

  var existing = ScriptApp.getProjectTriggers();
  for (var j = 0; j < existing.length; j++) {
    if (existing[j].getHandlerFunction() === 'onSubmit') ScriptApp.deleteTrigger(existing[j]);
  }
  ScriptApp.newTrigger('onSubmit').forForm(FormApp.getActiveForm()).onFormSubmit().create();
  Logger.log('Installed, writing ' + mapped + ' fields. Every submission from now on goes to GHL.');
}

function uninstall() {
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++) {
    if (t[i].getHandlerFunction() === 'onSubmit') ScriptApp.deleteTrigger(t[i]);
  }
  Logger.log('Uninstalled. Submissions still land in the sheet, just not in GHL.');
}

/**
 * Prints every custom field in the location, then a FIELD_MAP guessed by
 * matching each question against those field names.
 *
 * It is a guess and it says so. Read it before pasting it: a wrong match here
 * writes an answer into a field that means something else, which is worse than
 * writing nothing.
 */
function listFields() {
  var creds = credentials();
  var fields = fetchFields(creds);

  var out = ['Custom fields in this location:', ''];
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    out.push('  ' + pad(f.dataType || '?', 18) + pad(f.fieldKey || '', 42) + f.name);
  }

  out.push('', 'Suggested FIELD_MAP. Check every line, then paste over the one in the file:', '');
  out.push('var FIELD_MAP = [');

  /* A field is claimed once. Two questions here are both about cost, and left
     to itself the matcher gave them the same field, which would have had one
     answer overwrite the other on every submission. A blank is cheap to fill
     in; a wrong match that looks right is not. */
  var taken = {};
  var unmatched = 0;
  for (var m = 0; m < FIELD_MAP.length; m++) {
    var question = titleFor(FIELD_MAP[m].key);
    var best = bestMatch(question, fields, taken);
    var ref = best ? (best.fieldKey || best.id) : '';
    if (best) taken[best.id] = true;
    else unmatched++;
    var note = best ? '  // ' + question + '  ->  ' + best.name : '  // FILL IN: ' + question;
    out.push("  { key: '" + FIELD_MAP[m].key + "', ghl: '" + ref + "' }," + note);
  }
  out.push('];');
  if (unmatched) {
    out.push('', unmatched + ' question(s) found no field with a similar enough name. Fill those in from the list above, or leave them blank to skip that answer.');
  }
  Logger.log(out.join('\n'));
}

/* ── the trigger ────────────────────────────────────────────────────── */

function onSubmit(e) {
  Logger.log(send(read(e.response)));
}

function read(response) {
  var out = {};
  var items = response.getItemResponses();
  for (var i = 0; i < items.length; i++) {
    var title = items[i].getItem().getTitle().toLowerCase();
    for (var f = 0; f < FIELDS.length; f++) {
      if (title.indexOf(FIELDS[f].match) !== -1) {
        out[FIELDS[f].key] = items[i].getResponse();
        break;
      }
    }
  }
  return out;
}

/* ── GHL ────────────────────────────────────────────────────────────── */

function send(a) {
  var creds = credentials();
  var reach = parseContact(a.contact);
  if (!reach.email && !reach.phone && !CREATE_WITHOUT_CONTACT) {
    return 'No email or phone given, so there is nothing to upsert on. Left in the sheet.';
  }

  var defs = index(fetchFields(creds));
  var custom = [];
  var skipped = [];
  var used = {};

  for (var i = 0; i < FIELD_MAP.length; i++) {
    var row = FIELD_MAP[i];
    var value = a[row.key];
    if (value === undefined || value === null || value === '') continue;
    if (!row.ghl) {
      skipped.push(row.key + ' (no field named in FIELD_MAP)');
      continue;
    }
    var def = defs[row.ghl] || defs[String(row.ghl).toLowerCase()];
    if (!def) {
      skipped.push(row.key + ' (no field in GHL called ' + row.ghl + ')');
      continue;
    }
    /* Two rows pointing at one field means the second answer overwrites the
       first and nobody ever sees it happen. Refuse rather than pick. */
    if (used[def.id]) {
      skipped.push(row.key + ' (' + row.ghl + ' is already taken by ' + used[def.id] + ')');
      continue;
    }
    used[def.id] = row.key;

    var entry = { id: def.id };
    entry[VALUE_KEY] = format(value, def.dataType);
    custom.push(entry);
  }

  var payload = {
    locationId: creds.location,
    source: 'Ops research form',
    customFields: custom,
  };
  if (reach.email) payload.email = reach.email;
  if (reach.phone) payload.phone = reach.phone;

  /* GHL lists a contact by name, and a row called "No Name" is not findable
     three weeks later. The handle is the only name this form collects. */
  var handle = String(a.handle || '').replace(/^@+/, '').trim();
  if (handle) payload.firstName = '@' + handle;

  var res = call('POST', API + '/contacts/upsert', payload, creds.pit);
  if (res.getResponseCode() >= 300) {
    throw new Error('GHL upsert failed (' + res.getResponseCode() + '): ' + res.getContentText());
  }
  var body = JSON.parse(res.getContentText() || '{}');
  var contact = body.contact || body;

  return (
    'Wrote ' + custom.length + ' fields to contact ' + (contact.id || contact._id || '?') +
    (skipped.length ? '. Not written: ' + skipped.join(', ') : '.')
  );
}

/** A checkbox answer is an array. A multi-select field takes it as one; every
 *  other kind of field takes a line per answer. */
function format(value, dataType) {
  if (Object.prototype.toString.call(value) !== '[object Array]') return String(value);
  if (String(dataType).toUpperCase().indexOf('MULTIPLE') !== -1) return value;
  return value.join(', ');
}

function fetchFields(creds) {
  var res = call('GET', API + '/locations/' + creds.location + '/customFields', null, creds.pit);
  if (res.getResponseCode() >= 300) {
    throw new Error('Could not read custom fields (' + res.getResponseCode() + '): ' + res.getContentText());
  }
  var body = JSON.parse(res.getContentText() || '{}');
  return body.customFields || body.customField || [];
}

/** reachable by key or by id, either of which FIELD_MAP may name */
function index(fields) {
  var out = {};
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    if (f.id) out[f.id] = f;
    if (f.fieldKey) {
      out[f.fieldKey] = f;
      out[String(f.fieldKey).toLowerCase()] = f;
      // listFields prints the full key; a map written by hand often drops the
      // contact. prefix, so both reach the same field
      var bare = String(f.fieldKey).replace(/^contact\./, '');
      out[bare] = f;
      out[bare.toLowerCase()] = f;
    }
  }
  return out;
}

function call(method, url, payload, pit) {
  var opts = {
    method: method,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + pit, Version: VERSION, Accept: 'application/json' },
    muteHttpExceptions: true,
  };
  if (payload) opts.payload = JSON.stringify(payload);
  return UrlFetchApp.fetch(url, opts);
}

function credentials() {
  var props = PropertiesService.getScriptProperties();
  var pit = props.getProperty('GHL_PIT');
  var location = props.getProperty('GHL_LOCATION_ID');
  if (!pit || !location) {
    throw new Error('GHL_PIT or GHL_LOCATION_ID is not set in Script Properties.');
  }
  return { pit: pit, location: location };
}

/* ── helpers ────────────────────────────────────────────────────────── */

/**
 * The contact question is a free text box, so people answer it with an email,
 * a phone number, a handle, or a sentence. This takes whichever of the first
 * two it finds and ignores the rest.
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

/** the real question title behind a key, for the listFields suggestion */
function titleFor(key) {
  var items = FormApp.getActiveForm().getItems();
  for (var f = 0; f < FIELDS.length; f++) {
    if (FIELDS[f].key !== key) continue;
    for (var i = 0; i < items.length; i++) {
      if (items[i].getTitle().toLowerCase().indexOf(FIELDS[f].match) !== -1) return items[i].getTitle();
    }
    return FIELDS[f].match;
  }
  return key;
}

/** the field whose name shares the most words with the question, ignoring any
 *  already claimed by an earlier question */
function bestMatch(question, fields, taken) {
  var want = words(question);
  var best = null;
  var bestScore = 0;
  for (var i = 0; i < fields.length; i++) {
    if (taken && taken[fields[i].id]) continue;
    var have = words(fields[i].name || '');
    var score = 0;
    for (var w = 0; w < want.length; w++) if (have.indexOf(want[w]) !== -1) score++;
    if (score > bestScore) {
      bestScore = score;
      best = fields[i];
    }
  }
  return bestScore >= 2 ? best : null;
}

function words(s) {
  var stop = ' the a an of to in for you your is are do these it them this that how much would say which '.split(' ');
  var raw = String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/);
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i].length > 2 && stop.indexOf(raw[i]) === -1) out.push(raw[i]);
  }
  return out;
}

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += ' ';
  return s;
}

/* ── test ───────────────────────────────────────────────────────────── */

/** One fake submission, so the wiring is checked before real answers depend on
 *  it. Delete the contact it makes. */
function test() {
  Logger.log(
    send({
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
    })
  );
}
