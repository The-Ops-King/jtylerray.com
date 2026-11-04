/** jtylerray.com/apply — the B2B closer application. */

export const APPLY_ENDPOINT = "/api/apply";

/** Sent with every application and written to the Sheet. Not asked for:
 *  there is one role, so there is nothing to answer. */
export const ROLE = "B2B Closer";

/**
 * Whether the role is taking applications.
 *
 * Flip this to reopen or close, AND flip OPEN in api/apply.ts to match. The
 * page and the function are built separately, so neither can read the other's
 * value, and taking the form off the page does not stop a cached copy of it
 * posting to the endpoint.
 */
export const OPEN = true;

export const APPLY = {
  eyebrow: "Now hiring",
  title: "B2B Closer.",
  notes: [] as readonly string[],
};

/* ── what gets asked ───────────────────────────────────────────────── */

/** Years closing in the high ticket space. The first option is the one that
 *  ends the application, so it has to exist for the question to be honest:
 *  a dropdown that starts at "1 to 2 years" is not a question. */
export const YEARS = [
  "Less than 1 year",
  "1 to 2 years",
  "3 to 5 years",
  "More than 5 years",
] as const;

export const YEARS_UNDER_ONE = "Less than 1 year";

export const ON_OFFER = ["Yes, I'm closing on an offer now", "No, I'm available"] as const;

/**
 * How old a submitted call recording may be. Seven days is what the page asks
 * for; a month is the point past which it stops counting.
 *
 * CALL_ASK_DAYS is a day under the limit on purpose. Somebody who has a newer
 * call but reached for an older one would otherwise be turned away with no
 * idea they could have fixed it in ten seconds, and the warning arriving just
 * before the cliff is more use than one arriving at it.
 */
export const CALL_IDEAL_DAYS = 7;
export const CALL_ASK_DAYS = 30;
export const CALL_MAX_DAYS = 31;

/** Asked as soon as an old date is picked, not after the application is gone. */
export const CALL_PROMPT = {
  title: "Do you have a more recent call?",
  line: "That call is over a month old. A call from the last seven days is what we are looking for, so use a newer one if you have it.",
  change: "Let me pick another",
  keep: "That is my most recent",
};

/* ── what the page says afterwards ─────────────────────────────────── */

export const SENT = {
  title: "In.",
  line: "Your application is on my desk. Every one gets read and every one gets an answer.",
};

/**
 * Shown when an application does not meet the criteria.
 *
 * It says nothing about which criterion, on purpose. Naming it would turn the
 * form into a puzzle with the answers printed on the back.
 */
export const DECLINED = {
  title: "Thank you for applying.",
  line: "You don't meet our criteria right now. Please apply for the next offer.",
};

/** what the page says while it is closed */
export const CLOSED = {
  title: "Thank you.",
  line: "We're no longer taking applications for this role.",
};
