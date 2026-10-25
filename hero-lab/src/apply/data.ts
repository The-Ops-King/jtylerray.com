/** jtylerray.com/apply — the application, for both open roles. */

export const APPLY_ENDPOINT = "/api/apply";

export type Role = { id: string; label: string; blurb: string; placeholder: string };

/**
 * The roles, and what each one changes about the page.
 *
 * The page was written for a closer: the headline, the terms and the
 * experience box all assumed one job. Rather than write around both, the role
 * is the first question and the parts that differ follow it.
 */
export const ROLES: Role[] = [
  {
    id: "closer",
    label: "Closer",
    blurb: "Taking booked calls and closing high-ticket offers.",
    placeholder:
      "Where you have closed in the high-ticket space: the offers, the price points, the close rates, your best month, and how long you were there. Write it however you would say it.",
  },
  {
    id: "nurture",
    label: "Lead Nurture",
    blurb: "Working the existing database and turning quiet leads into booked calls.",
    placeholder:
      "Where you have worked a database or a pipeline: the offers, how you reached people, what you booked out of it, and how long you were there. Write it however you would say it.",
  },
];

export const APPLY = {
  eyebrow: "Now hiring",
  title: "Two roles open.",
  lede: "High-ticket offers, warm pipeline, and an operation that actually feeds you leads. Pick the role and tell me what you have done.",
  /** the things anyone wants to know before they fill anything in. Both roles
   *  work leads that already exist, so none of these needed splitting. */
  notes: [
    "Commission only, uncapped.",
    "No cold prospecting.",
    "Every application is read. You hear back either way.",
  ],
} as const;
