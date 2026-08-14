export type Copy = {
  id: string;
  /** switcher label — taken from the headline itself */
  name: string;
  eyebrow: string;
  /** one entry per rendered line */
  headline: string[];
  /** word or phrase inside the headline that takes the accent treatment */
  mark?: string;
  lede: string;
};

const LEDE =
  "CRM architecture, automations, reporting, and call intelligence for coaching and education businesses. Built to hold when the volume arrives.";

export const COPY: Copy[] = [
  {
    /* the decided hero — this is what /new-home ships */
    id: "hybrid",
    name: "hybrid",
    eyebrow: "Sales infrastructure for coaching and education",
    headline: ["I build the systems", "sales teams run on."],
    mark: "systems",
    lede: LEDE,
  },
  {
    id: "systems",
    name: "the systems",
    eyebrow: "Sales infrastructure for high-ticket teams",
    headline: ["I build the systems", "sales teams run on."],
    mark: "run on",
    lede: LEDE,
  },
  {
    id: "built-properly",
    name: "built properly",
    eyebrow: "High-ticket sales operations. Built properly.",
    headline: ["Sales operations.", "Built properly."],
    mark: "Built properly",
    lede: LEDE,
  },
  {
    id: "duct-tape",
    name: "duct tape",
    eyebrow: "One person. Not an agency.",
    headline: ["Sales operations for coaching", "businesses that outgrew", "duct tape."],
    mark: "duct tape",
    lede: LEDE,
  },
  {
    id: "infrastructure",
    name: "infrastructure",
    eyebrow: "Sales infrastructure for high-ticket teams",
    headline: ["I build the sales infrastructure.", "You run the business."],
    mark: "sales infrastructure",
    lede: "I don't manage your closers or write your offer. I build what they run on, and I build it to hold.",
  },
  {
    id: "backend",
    name: "your backend",
    eyebrow: "One person. Not an agency.",
    headline: ["Your offer works.", "Your backend", "doesn't."],
    mark: "doesn't",
    lede: "The offer converts. The infrastructure underneath it was never built for this volume. That's the part I fix.",
  },
];

export const COPY_KEY = "jtr-copy";
