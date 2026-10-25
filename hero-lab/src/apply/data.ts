/** jtylerray.com/apply — the lead nurture application. */

export const APPLY_ENDPOINT = "/api/apply";

/** One role is open. It is sent with every application and written to the
 *  Sheet, so applications stay told apart if a second role opens later, but
 *  nothing on the page asks for it: there is only one answer. */
export const ROLE = "Lead Nurture Specialist";

export const APPLY = {
  eyebrow: "Now hiring · Lead Nurture Specialist",
  title: "Apply to book calls.",
  lede: "High-ticket offers, a database nobody is working, and an operation that actually feeds you leads. Tell me who you are and what you have booked.",
  /** the one thing an applicant wants to know before they fill anything in */
  notes: [
    "Commission only, uncapped.",
    "You work leads that already exist. No cold prospecting.",
    "Every application is read. You hear back either way.",
  ],
} as const;

export const EXPERIENCE_PLACEHOLDER =
  "Where you have worked a database or a pipeline: the offers, how you reached people, what you booked out of it, and how long you were there. Write it however you would say it.";
