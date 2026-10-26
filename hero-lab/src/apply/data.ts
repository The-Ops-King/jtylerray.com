/** jtylerray.com/apply — the lead nurture specialist application. */

export const APPLY_ENDPOINT = "/api/apply";

/** Sent with every application and written to the Sheet. Not asked for:
 *  there is one role, so there is nothing to answer. */
export const ROLE = "Lead Nurture Specialist";

/**
 * Whether the role is taking applications.
 *
 * Flip this to true to reopen. The form is still here, still wired to
 * /api/apply and still writing to the Sheet, so reopening is this one line
 * and a deploy rather than a rebuild.
 */
export const OPEN = false;

export const APPLY = {
  eyebrow: "Now hiring",
  title: "Lead Nurture Specialist.",
  notes: [] as readonly string[],
};

/** what the page says while it is closed */
export const CLOSED = {
  title: "Thank you.",
  line: "We're no longer taking applications for this role.",
};
