/**
 * Every word on the page. Kept apart from the layout so copy can be edited
 * without touching structure.
 *
 * House style, from the brand guide: state what was broken, then state what
 * was built. No client names, no revenue or growth claims, no em dashes, no
 * hype adjectives.
 */

/** Where every "Fix your systems" goes. The card carries email, SMS, WhatsApp and
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
  eyebrow: "Sales infrastructure for high-ticket coaching and education",
  headline: ["I build the ", "systems", " sales teams run on."] as const,
  /* The headline says "systems", which is the one word on the page that needs
     defining. This names them, puts the border around the work ("after the
     lead"), and then says what the engagement is like: nothing gets ripped out
     that is not costing him anything. */
  subtext:
    "Everything that happens after marketing generates the lead: the CRM, the routing, the follow-up, the reporting. I start with what you already run and rebuild only the parts that are costing you.",
};

/** The five things I build, named the way the buyer names them. GoHighLevel
 *  is on the first screen deliberately: this buyer runs it. */
export const RAIL: { label: string; sub: string }[] = [
  { label: "CRM architecture", sub: "GoHighLevel · HubSpot · Close" },
  { label: "Automation", sub: "Routing and enrichment" },
  { label: "Reporting", sub: "Pipeline · cohort · attribution" },
  { label: "Call intelligence", sub: "Transcripts written to fields" },
  { label: "Custom software", sub: "When no tool exists" },
];

/* ── the argument ──────────────────────────────────────────────────── */

/** The page's point of view, and the symptoms that carry it.
 *
 * This sits between the hero and 01, unnumbered, because it is the thesis
 * rather than one of the sections under it. The reader should meet their own
 * problem before they meet the work: symptom first, then system.
 *
 * The first three symptoms are the contact section's own line, moved up. They
 * were the clearest writing on the page and they were sitting past everything
 * they would have helped the reader understand.
 */
export const POV = {
  headline: "More leads will not fix an operation that cannot handle them.",
  prose: [
    "When revenue gets inconsistent, the usual answer is more lead generation. If the CRM is disorganized, follow-up depends on who remembers, and nobody owns the handoff, more volume only means more places for things to break.",
    "Growth does not always need another tool. Sometimes it needs the thing you already run to be made usable, and the gaps between marketing and sales closed.",
  ],
  symptomsHead: "You already know if this is you.",
  symptoms: [
    "A booking that never reaches the CRM.",
    "Reporting nobody believes, so nobody opens it.",
    "Follow-up that depends on who remembers.",
    "An automation the team has quietly built a workaround for.",
    "One person who understands the process, which means there isn't one.",
  ],
};

/* ── 01 · what I do ────────────────────────────────────────────────── */

/** The rail already said what gets built. This says how the work is done.
 *  Short by design, and it hands the reader straight to 02. */
export const WHAT_I_DO = {
  prose: [
    "The problem decides the tool. Sometimes that's a CRM cleanup, sometimes an automation, sometimes a dashboard, sometimes a piece of software that didn't exist until it needed to. All of it sits after the lead arrives, in the handoffs between marketing and a closed deal.",
    "No-code covers a lot of it. Past that I write the code, which is where systems stop breaking under real volume.",
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
    line: "I work directly with the founder and the team, with nobody in between. Outside of work I train martial arts and hold a black belt.",
  },
];

/* ── 05 · contact ──────────────────────────────────────────────────── */

export const CONTACT = {
  headline: "How can I help?",
  /* The span, then the ask. The list is the questions a founder has about
     their own pipeline rather than the tools it runs on, so it does not
     repeat the rail sitting up in the hero. */
  line: "I handle everything between the lead arriving and the handoff to fulfillment: where it lands, who owns it, what happens next, and what you can see about any of it. Bring the part you don't trust.",
};
