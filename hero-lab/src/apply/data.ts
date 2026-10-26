/** jtylerray.com/apply — the lead nurture specialist application. */

export const APPLY_ENDPOINT = "/api/apply";

/** Sent with every application and written to the Sheet. Not asked for:
 *  there is one role, so there is nothing to answer. */
export const ROLE = "Lead Nurture Specialist";

/**
 * Whether the role is taking applications.
 *
 * Flip this to reopen, AND flip OPEN in api/apply.ts to match. The page and
 * the function are built separately, so neither can read the other's value,
 * and taking the form off the page does not stop a cached copy of it posting
 * to the endpoint.
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
