/** jtylerray.com/apply — the closer application. */

export const APPLY_ENDPOINT = "/api/apply";

export const APPLY = {
  eyebrow: "Now hiring · Closer",
  title: "Apply to close.",
  lede: "High-ticket offers, warm pipeline, and an operation that actually feeds you leads. Tell me who you are and what you have closed.",
  /** the one thing a closer wants to know before they fill anything in */
  notes: [
    "Commission only, uncapped.",
    "Booked calls come to you — no cold prospecting.",
    "Every application is read. You hear back either way.",
  ],
} as const;
