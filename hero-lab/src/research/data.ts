/**
 * jtylerray.com/research — the market research form.
 *
 * Every word and every option, kept apart from the flow so the copy can be
 * edited without touching the conditional logic in Research.tsx.
 *
 * The page says almost nothing before the first question. The framing belongs
 * in the message that carries the link, not in a wall of text above a form
 * somebody already agreed to fill in.
 */

export const RESEARCH_ENDPOINT = "/api/research";

export const INTRO = {
  eyebrow: "Market research",
  title: "Thanks so much for your feedback.",
} as const;

/* ── the list ──────────────────────────────────────────────────────── */

/**
 * The twelve builds from the work section, written as the owner would say them
 * out loud. Every label is a literal statement about the business, because the
 * reader has to recognise themselves in it at a glance: a figure of speech
 * costs them a second of interpretation, and a second of interpretation is a
 * tap they do not make.
 *
 * `id` is what gets stored and tagged, so these are stable: changing a label
 * is a copy edit, changing an id splits the data in two.
 */
export type Problem = { id: string; label: string };

export const PROBLEMS: Problem[] = [
  { id: "speed-to-lead", label: "It takes too long to contact new leads" },
  { id: "lead-ownership", label: "It's not clear who should call a new lead" },
  { id: "crm-junk", label: "The CRM is messy and out of date" },
  { id: "call-outcomes", label: "Reps don't record what happened on their calls" },
  { id: "follow-up", label: "Follow-up only happens if someone remembers" },
  { id: "call-visibility", label: "Don't know what reps say on calls" },
  { id: "rep-numbers", label: "Can't see how each rep is performing" },
  { id: "trust-reporting", label: "Can't trust the numbers in the reports" },
  { id: "commissions", label: "Commissions take hours to work out by hand" },
  { id: "handoff", label: "New clients get missed after they buy" },
  { id: "one-person", label: "Only one person knows how the process works" },
  { id: "workarounds", label: "The team works around the system we built" },
];

/* ── the options ───────────────────────────────────────────────────── */

export const DURATION = [
  "A few months",
  "6 to 12 months",
  "1 to 2 years",
  "Longer than I want to admit",
] as const;

/** Asked as a guess, in a box, because nobody has the figure to hand and
 *  bands make them pick the nearest wall rather than say what they think. */
export const COST_PLACEHOLDER = "A rough guess is fine";

export const SPEND = [
  "No, not yet",
  "Tried to fix it in-house",
  "Bought software",
  "Hired someone",
  "Something else",
] as const;

/** picking this one opens a box */
export const SPEND_OTHER = "Something else";

/** The last question, as asked: are you looking, or open to a call. Two
 *  options, and no answer is an answer — the form submits without one. */
export type Intent = { id: string; label: string };

export const INTENT: Intent[] = [
  { id: "looking", label: "I'm actively looking for help with this" },
  { id: "open", label: "I'm open to a call about how we might solve it" },
];

export const DONE = {
  title: "Thank you.",
  line: "That is genuinely useful.",
  lineContact: "That is genuinely useful. I'll be in touch.",
} as const;
