/** jtylerray.com/apply — the lead nurture specialist application. */

export const APPLY_ENDPOINT = "/api/apply";

/** Sent with every application and written to the Sheet. Not asked for:
 *  there is one role, so there is nothing to answer. */
export const ROLE = "Lead Nurture Specialist";

/**
 * The role and the form, and nothing else. Nothing here describes the job,
 * because nobody has described it to me.
 *
 * `notes` is where the terms go if there are ever any to state.
 */
export const APPLY = {
  eyebrow: "Now hiring",
  title: "Lead Nurture Specialist.",
  notes: [] as readonly string[],
};
