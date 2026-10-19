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
 * The twelve builds from the work section, rewritten as the complaint the
 * buyer actually has. Nobody taps "AI call scorecard"; everybody taps "no idea
 * what's said on calls".
 *
 * `id` is what gets stored and tagged, so these are stable: changing a label
 * is a copy edit, changing an id splits the data in two.
 */
export type Problem = { id: string; label: string };

export const PROBLEMS: Problem[] = [
  { id: "lead-ownership", label: "Nobody owns new leads" },
  { id: "crm-junk", label: "CRM is a junk drawer" },
  { id: "speed-to-lead", label: "Too slow to call new leads" },
  { id: "call-outcomes", label: "Call outcomes never get logged" },
  { id: "follow-up", label: "Follow-up falls through" },
  { id: "rep-numbers", label: "No per-rep numbers" },
  { id: "trust-reporting", label: "Can't trust the reporting" },
  { id: "call-visibility", label: "No idea what's said on calls" },
  { id: "commissions", label: "Commissions are manual" },
  { id: "handoff", label: "Messy handoff to onboarding" },
  { id: "one-person", label: "It all lives in one person's head" },
  { id: "workarounds", label: "Automations the team works around" },
];

/* ── the options ───────────────────────────────────────────────────── */

export const DURATION = [
  "A few months",
  "6 to 12 months",
  "1 to 2 years",
  "Longer than I want to admit",
] as const;

/** A number, because a number is the question. Ranges rather than a free box:
 *  nobody has the figure to hand, everybody can pick the band it falls in, and
 *  picking one is the moment the problem stops being an annoyance and starts
 *  being an amount. The last option is there because at this size it is often
 *  the honest answer, and a cost nobody can measure is itself a finding. */
export const COST = [
  "Under $10k",
  "$10k to $50k",
  "$50k to $250k",
  "More than $250k",
  "Hard to put a number on it",
] as const;

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
