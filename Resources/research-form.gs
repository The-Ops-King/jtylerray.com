/**
 * Builds the market research form as a Google Form, in one run.
 *
 * Why a Google Form and not only jtylerray.com/research: a link to a domain
 * someone half-recognises, sent in a DM, reads as a funnel. docs.google.com
 * reads as a survey. The page is the better instrument and the form is the
 * one more people will open, which is a trade worth measuring rather than
 * guessing at.
 *
 * RUN IT (once):
 *  1. script.google.com, New project, paste this whole file in.
 *  2. Run > build. Authorise when asked (it needs Forms and Drive).
 *  3. The log prints three URLs: the form to send, the editor to change it,
 *     and the responses spreadsheet. The run also leaves them in a dialog if
 *     you are in a bound script.
 *
 * Running it again builds a second, separate form. It never edits the first.
 *
 * WHAT THIS CANNOT DO that the page does:
 *  - rank the problems by dragging. Forms has no ranking question, so the
 *    worst one is asked separately, as its own question, listing all twelve
 *    again. One extra question buys back the single most useful answer.
 *  - name their worst problem inside the questions that follow it. Forms
 *    cannot put an answer into a later question, so those read "that one".
 */

var TITLE = 'A few questions about how your sales operation runs';

/* The description is the other half of what a link preview shows, so it says
   what this is and what it is not, in two lines. */
var BLURB =
  "I'm trying to work out what actually breaks in sales operations at " +
  'coaching and education companies.\n\n' +
  'Nothing is being sold here. About two minutes, most of it tapping.';

var PROBLEMS = [
  'It takes too long to contact new leads',
  "It's not clear who should call a new lead",
  'The CRM is messy and out of date',
  "Reps don't record what happened on their calls",
  'Follow-up only happens if someone remembers',
  "Don't know what reps say on calls",
  "Can't see how each rep is performing",
  "Can't trust the numbers in the reports",
  'Commissions take hours to work out by hand',
  'New clients get missed after they buy',
  'Only one person knows how the process works',
  'The team works around the system we built',
];

var DURATION = [
  'A few months',
  '6 to 12 months',
  '1 to 2 years',
  'Longer than I want to admit',
];

var SPEND_NO = [
  "No, it's not that important to me",
  "No, I don't know where to find help",
  "No, I don't know how to fix it",
];

var SPEND_YES = [
  "Yes, I've tried a few things myself",
  'Yes, I bought software',
  'Yes, I hired someone',
  'Something else',
];

var INTENT_YES = ["Yes, I'm actively looking for help", "Yes, I'm open to a call about it"];
var INTENT_NO = "No, I'm not looking for help";

function build() {
  var form = FormApp.create(TITLE);
  form.setDescription(BLURB);
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage('Thank you. That is genuinely useful.');
  // a Workspace-only setting: a personal account throws rather than ignoring it
  try {
    form.setRequireLogin(false);
  } catch (e) {}

  /* Everything is created in reading order first, because a page break has to
     exist before a choice can point at it. The branching is wired at the end,
     once every page has an object to name. */

  // ── page 1 ──────────────────────────────────────────────────────────
  form
    .addCheckboxItem()
    .setTitle('Which of these sound like you?')
    .setChoiceValues(PROBLEMS)
    .showOtherOption(true)
    .setRequired(true);

  /* The page ranks these by drag. Forms cannot, so the top one is its own
     question. It is the answer every question after it depends on, which is
     worth asking twice over not having it. */
  form
    .addMultipleChoiceItem()
    .setTitle('Of the ones you picked, which is the worst?')
    .setChoiceValues(PROBLEMS)
    .showOtherOption(true)
    .setRequired(true);

  // ── page 2: about that one ──────────────────────────────────────────
  var pCost = form.addPageBreakItem().setTitle('About that one');

  form
    .addMultipleChoiceItem()
    .setTitle('How long has that been going on?')
    .setChoiceValues(DURATION);

  form
    .addTextItem()
    .setTitle('How much would you guess that has cost you?')
    .setHelpText('A rough guess is fine.');

  /* Branching reads the last question on a page, so this one sits alone at
     the end of its page with nothing under it. */
  var spend = form
    .addMultipleChoiceItem()
    .setTitle('Have you spent money trying to fix it?')
    .setRequired(true);

  // ── page 3: only for a yes ──────────────────────────────────────────
  var pWhat = form.addPageBreakItem().setTitle('What happened');
  form
    .addParagraphTextItem()
    .setTitle('What happened?')
    .setHelpText("What you tried, and why it didn't work. Optional.");

  // ── page 4: everyone ────────────────────────────────────────────────
  var pLast = form.addPageBreakItem().setTitle('Last couple');

  form
    .addTextItem()
    .setTitle('Where do you go when you need to figure this stuff out?')
    .setHelpText('People, podcasts, communities, whoever you ask. Optional.');

  /* Asked rather than hidden. It can also be filled in from the link, so a DM
     can carry it and the person never types it: see prefillUrl() below. */
  form.addTextItem().setTitle('Your Instagram handle');

  var intent = form
    .addMultipleChoiceItem()
    .setTitle('Are you looking for help with this?')
    .setRequired(true);

  // ── page 5: only for a yes ──────────────────────────────────────────
  var pWho = form.addPageBreakItem().setTitle('Where to reach you');
  form.addTextItem().setTitle('First name').setRequired(true);
  form.addTextItem().setTitle('Email');
  form.addTextItem().setTitle('Phone').setHelpText('Either one is enough.');

  /* ── the branching ───────────────────────────────────────────────────
     A no on spending skips the what-happened page. A no on help skips the
     contact page and submits, so nobody is asked for a number they did not
     offer to give. */
  var spendChoices = [];
  for (var i = 0; i < SPEND_NO.length; i++) {
    spendChoices.push(spend.createChoice(SPEND_NO[i], pLast));
  }
  for (var j = 0; j < SPEND_YES.length; j++) {
    spendChoices.push(spend.createChoice(SPEND_YES[j], pWhat));
  }
  spend.setChoices(spendChoices);

  // the what-happened page falls through to the last one
  pWhat.setGoToPage(pLast);

  var intentChoices = [];
  for (var k = 0; k < INTENT_YES.length; k++) {
    intentChoices.push(intent.createChoice(INTENT_YES[k], pWho));
  }
  intentChoices.push(intent.createChoice(INTENT_NO, FormApp.PageNavigationType.SUBMIT));
  intent.setChoices(intentChoices);

  // ── responses ───────────────────────────────────────────────────────
  var sheet = SpreadsheetApp.create('Research responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  var out =
    'Send this:  ' + form.getPublishedUrl() + '\n' +
    'Edit it:    ' + form.getEditUrl() + '\n' +
    'Responses:  ' + sheet.getUrl() + '\n\n' +
    'Prefilled for one person (swap the handle):\n' +
    prefillUrl(form, 'theirhandle');

  Logger.log(out);
  return out;
}

/**
 * A link with the Instagram handle already in it, so a DM can carry who is
 * answering and they never type it.
 *
 * Forms shows a prefilled field as an ordinary filled-in one, which they can
 * change. That is the honest version of what the page does silently in ?ig=,
 * and on a form that opens by saying nothing is being sold, visible is the
 * right side to err on.
 */
function prefillUrl(form, handle) {
  var items = form.getItems(FormApp.ItemType.TEXT);
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === 'Your Instagram handle') {
      var response = form.createResponse();
      response.withItemResponse(items[i].asTextItem().createResponse(handle));
      return response.toPrefilledUrl();
    }
  }
  return '(could not find the handle question)';
}
