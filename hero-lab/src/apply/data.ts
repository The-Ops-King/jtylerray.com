/** jtylerray.com/apply — the lead nurture specialist application. */

export const APPLY_ENDPOINT = "/api/apply";

/** Sent with every application and written to the Sheet. Not asked for:
 *  there is one role, so there is nothing to answer. */
export const ROLE = "Lead Nurture Specialist";

/**
 * The page says the role, asks them to apply, and asks what qualifies them.
 * Nothing here describes the job, because nobody has told me what it is, and
 * a wrong description on a hiring page costs more than a short one.
 *
 * `notes` is where the terms go if there are any to state. The closer version
 * carried three and they were the closer's, not this role's.
 */
export const APPLY = {
  eyebrow: "Now hiring",
  title: "Lead Nurture Specialist.",
  lede: "Tell me who you are and what qualifies you.",
  notes: [] as readonly string[],
};
