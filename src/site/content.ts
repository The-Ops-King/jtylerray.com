/**
 * Every word on the page. Kept apart from the layout so copy can be edited
 * without touching structure.
 *
 * House style, from the brand guide: state what was broken, then state what
 * was built. No client names, no revenue or growth claims, no em dashes, no
 * hype adjectives.
 */

export const EMAIL = "jt@jtylerray.com";

/** Where every "Get in touch" goes. The card carries email, SMS, WhatsApp and
 *  both booking lengths, so it answers the question a mailto: only half
 *  answers — and it opens in the browser rather than in a mail client the
 *  visitor may not have set up. Root-relative: the card ships to
 *  jtylerray.com/card from this same repo's card build. */
export const CONTACT_URL = "/card/";

export const BOOKING =
  "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1sNdq-fawbkAreIeJGRBENL0uXrpEAvGVGj6JXNZv8B00hdPgkoYIDvSotwQotDPXGe_LL5drV";

/* ── hero ──────────────────────────────────────────────────────────── */

/** The rail lists the deliverables, so the subtext carries the difference
 *  instead of repeating them. */
export const HERO = {
  eyebrow: "Sales infrastructure for coaching and education",
  headline: ["I build the ", "systems", " sales teams run on."] as const,
  subtext:
    "When the no-code tools run out of road, I write code. That's the line most operators can't cross.",
  note: "One person. Not an agency.",
};

/** The five things I build, named the way the buyer names them. GoHighLevel
 *  is on the first screen deliberately: this buyer runs it. */
export const RAIL: { label: string; sub: string }[] = [
  { label: "CRM architecture", sub: "GoHighLevel · HubSpot · Close" },
  { label: "Automation", sub: "Routing · enrichment · alerts" },
  { label: "Reporting", sub: "Pipeline · cohort · attribution" },
  { label: "Call intelligence", sub: "Transcripts written to fields" },
  { label: "Custom software", sub: "When no tool exists" },
];

/* ── 01 · what I do ────────────────────────────────────────────────── */

/** The rail already said what gets built. This says how the work is done.
 *  Short by design, and it hands the reader straight to 02. */
export const WHAT_I_DO = {
  prose: [
    "The problem decides the tool. Sometimes that's a CRM cleanup, sometimes an automation, sometimes a dashboard, sometimes a piece of software that didn't exist until it needed to. Most of it ends up living between the systems rather than inside any one of them.",
    "No-code covers a lot of it. When it runs out of road I write the code, which is where systems stop breaking under real volume.",
    "I'm not a coach and I'm not a sales trainer. I'm the operator behind them: the CRM, the automations, the reporting, and the SOPs your team runs on.",
  ],
};

/* ── 02 · the work ─────────────────────────────────────────────────── */

/** The suite: every build, grouped by area. `detail` is the second line, shown
 *  when a reader opens the entry — the list stays glanceable without it. */
export type Build = { title: string; detail?: string };
export type Area = { category: string; items: Build[] };

export const SUITE: Area[] = [
  {
    category: "CRM and data",
    items: [
      {
        title: "GoHighLevel CRM rebuild",
        detail:
          "Pipelines restructured, tag architecture cut to a working set, custom fields and region routing rebuilt underneath.",
      },
      {
        title: "Disposition data recovery",
        detail:
          "Found and backfilled call outcomes that had silently failed to sync, recovering closed-won deals nobody knew existed.",
      },
    ],
  },
  {
    category: "Automation",
    items: [
      {
        title: "Post-call disposition system",
        detail:
          "Calendly to Zapier to GoHighLevel to Airtable. Every booked call flows through to a logged outcome, with automated chasing for anything left blank.",
      },
      {
        title: "Slack disposition router",
        detail:
          "Posts every completed call to a channel, confirms in thread when the form comes back, and sends each closer their outstanding list at end of day.",
      },
      {
        title: "Speed-to-lead instrumentation",
        detail:
          "Measured time from lead to first contact, then rebuilt the routing around it. Hours to minutes.",
      },
      {
        title: "Setter round-robin assignment",
        detail:
          "Distributes booked calls evenly across setters without anyone touching it.",
      },
    ],
  },
  {
    category: "Reporting",
    items: [
      {
        title: "Sales performance dashboard",
        detail:
          "BigQuery and Looker Studio. Booked, showed, closed, show rate, offer rate, close rate, and cash collected, per rep and over time.",
      },
      {
        title: "Airtable performance tracking base",
        detail: "Built from scratch for a team with no reporting layer.",
      },
      {
        title: "Closer leaderboard bot",
        detail:
          "Slack app that ranks closers on cash collected and awards medals for top performance.",
      },
      {
        title: "Commission tracker",
        detail: "Calculates closer and owner commissions off cash collected.",
      },
    ],
  },
  {
    category: "Call intelligence and quality",
    items: [
      {
        title: "Sales integrity audit",
        detail:
          "Live dashboard comparing what closers actually say on calls against the offer and against what fulfillment delivers.",
      },
      {
        title: "AI call scorecard",
        detail:
          "Scores every closing call automatically so manual review goes only to the calls that need it.",
      },
      {
        title: "Playbook adherence scoring",
        detail:
          "Scores each call against the master playbook and shows exactly where the rep went off it.",
      },
    ],
  },
  {
    category: "Enablement and delivery",
    items: [
      {
        title: "Role-segmented call intelligence site",
        detail:
          "Internal site split by setter, closer, and manager, holding scripts, dashboards, and tools for each.",
      },
      {
        title: "Offer toolkit",
        detail:
          "Offer dictionary, avatar builder, and pricing cheat sheets for the sales team.",
      },
      {
        title: "Client onboarding-to-fulfillment system",
        detail:
          "Airtable-backed client journey built for a company that had none.",
      },
    ],
  },
];

/* ── 03 · who I am ─────────────────────────────────────────────────── */

/** Four entries. Each one states what the period gave, not what it achieved. */
export type Era = { period: string; title: string; line: string };

export const TIMELINE: Era[] = [
  {
    period: "Inside the room",
    title: "Four years on the phone",
    line: "Selling high-ticket offers taught me what a sales team actually does all day, and what the CRM never sees.",
  },
  {
    period: "Sales operations",
    title: "The other side of the desk",
    line: "Running operations showed me the same failure in every account: the process was fine, the system underneath it was improvised.",
  },
  {
    period: "Sales technology",
    title: "Co-founded and built",
    line: "Built a call intelligence platform end to end, which is where I learned what makes software a team keeps open instead of works around.",
  },
  {
    period: "Now",
    title: "One operation at a time",
    line: "I work directly with the founder and the team. Nobody sits between the problem and the person fixing it.",
  },
];

/* ── 04 · contact ──────────────────────────────────────────────────── */

export const CONTACT = {
  headline: "Let's talk about what's broken.",
  line: "Bring the part of the operation you don't trust: a booking that never reaches the CRM, reporting nobody believes, or a launch the current setup will not survive.",
};
