/**
 * jtylerray.com/research — the market research form.
 *
 * Every word and every option, kept apart from the flow so the copy can be
 * edited without touching the conditional logic in Research.tsx.
 *
 * The frame is the whole design: there is nothing being sold on this page, and
 * the last question is the only one that mentions help at all. House style from
 * the brand guide applies — plain words, no hype, no em dashes.
 */

export const RESEARCH_ENDPOINT = "/api/research";

export const INTRO = {
  eyebrow: "Market research",
  title: "I've got nothing to sell you.",
  lede: "I'm trying to work out what actually breaks in the sales operations at coaching and education companies, so the things I write are useful instead of guesswork.",
  notes: [
    "About two minutes. Most of it is tapping.",
    "The last question asks whether you want help with any of this. No is a real answer.",
    "I read every one of these myself.",
  ],
  /** shown only when the link carried a handle, so the capture is stated
   *  rather than discovered. Nothing is hidden: the handle is legible in the
   *  URL they clicked, and this says so out loud. */
  tokenNote: "Your handle came through in the link, so there is nothing to type.",
  /** the same statement for a link sent by email or SMS, where what came
   *  through is the contact record rather than a handle */
  refNote: "This link is yours, so I already know who is answering.",
} as const;

/* ── the list ──────────────────────────────────────────────────────── */

/**
 * The twelve builds from the work section, rewritten as the complaint the
 * buyer actually has. Nobody taps "AI call scorecard"; everybody taps "no idea
 * what's said on calls". Same signal, and a list that reads like it was
 * written about them.
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

export const TEAM_SIZE = ["None, it's me", "1–2", "3–5", "6–15", "15+"] as const;

export const DURATION = [
  "A few months",
  "6 to 12 months",
  "1 to 2 years",
  "Longer than I want to admit",
] as const;

/** "Honestly, no idea" stays on the list. At this size it is the true answer
 *  more often than not, and it is a finding rather than a non-answer: a cost
 *  nobody can measure is the problem underneath half the list above. Take the
 *  option away and people invent a number to look competent, which ruins the
 *  one question most worth having clean. */
export const COST = [
  "Deals we should have closed",
  "Hours every week",
  "Money spent patching it",
  "Trust in our own numbers",
  "Honestly, no idea",
] as const;

export const SPEND = [
  "No, not yet",
  "Tried to fix it in-house",
  "Bought software",
  "Hired someone",
] as const;

/** The content question. It assumes they are the one solving the problem,
 *  which is what keeps it research rather than a pitch in research costume —
 *  and the answer distribution is a writing calendar either way. */
export const STUCK = [
  "Knowing what to even ask for",
  "Picking the tool",
  "Actually building it",
  "Getting the team to use it",
  "Finding the time",
  "Paying for it",
] as const;

/**
 * The last question, and the one the frame rests on.
 *
 * The fourth door is load-bearing. Without it both answers are yes, anyone who
 * wants neither has to lie or abandon the form, and the promise at the top of
 * the page stops being true on the last screen. With it, the people who pick
 * the first two mean it.
 */
export type Intent = { id: string; label: string };

export const INTENT: Intent[] = [
  { id: "looking", label: "I'm actively looking for help with this" },
  { id: "open", label: "Not looking, but open to a call about it" },
  { id: "content", label: "Just send me whatever you work out" },
  { id: "nothing", label: "Nothing. I was just answering the questions" },
];

/** the doors that need somewhere to reply to */
export const WANTS_CONTACT = ["looking", "open", "content"];

export const DONE = {
  title: "Got it.",
  line: "That is genuinely useful, thank you. I read these myself and what comes out of them decides what I write next.",
  lineContact: "That is genuinely useful, thank you. I read these myself, and since you asked me to follow up, I will be in touch directly.",
} as const;
