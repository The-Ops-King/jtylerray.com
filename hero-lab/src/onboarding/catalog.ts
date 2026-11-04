/**
 * jtylerray.com/client-onboarding — what the client is asked about.
 *
 * Everything the page says about a tool lives here, so adding a tool or a
 * section is an entry in this file and nothing else. The page reads it; the
 * function never does (the client sends a computed summary with each save).
 *
 * Steps are written as templates. `{invite}` is the address every invite goes
 * to (team@theircompany by default, jt@jtylerray.com if they chose it) and
 * `{phone}` is Tyler's number, for the tools that invite by phone.
 *
 * Doc links are only given where the page was checked to exist and to be the
 * right article. A dead help link is worse than none: it reads as the client's
 * fault that they could not follow it.
 */

export const TYLER = {
  name: "Tyler",
  email: "jt@jtylerray.com",
  phone: "+1 480-516-3213",
  /** dialable / textable form */
  phoneHref: "+14805163213",
} as const;

export type Tool = {
  id: string;
  name: string;
  /** what "admin" is called in this tool, in the question and in the summary */
  role: string;
  steps: string[];
  docs?: { label: string; href: string };
  /** a paid plan is needed; the page asks, and "no" is noted for Tyler */
  paid?: boolean;
  /** a one-line note under the question, for tools with a catch */
  note?: string;
};

export type Section = {
  id: string;
  /** "communication", used in "Which do you use for ___?" */
  noun: string;
  title: string;
  tools: Tool[];
};

/** An "Other" entry is built from this, with the name the client typed. */
export const otherTool = (sectionId: string, name: string): Tool => ({
  id: `${sectionId}:other`,
  name: name.trim() || "Other",
  role: "Admin",
  steps: [
    "Find the team or user settings in the tool.",
    "Invite {invite} with the highest role it offers (Admin or Owner).",
    "If it only allows one user, text Tyler before you share a login.",
  ],
});

/* ── the workspace step ─────────────────────────────────────────────── */

/**
 * Google Workspace is not a section like the others. It runs first, it is one
 * tool, and its answer decides where every later invite goes.
 */
export const WORKSPACE = {
  title: "Google Workspace",
  steps: [
    "Go to admin.google.com and open Directory, then Users, then Add new user.",
    "Name it Team and set the address to team@ your domain (for example team@acme.com).",
    "Set a temporary password and tick \"Ask user to change their password when they sign in.\"",
    "Open the new user, go to Admin roles and privileges, and assign Super Admin.",
    "Put the password in a one-time link at onetimesecret.com and email only the link to jt@jtylerray.com.",
  ],
  docs: [
    { label: "Add a user", href: "https://support.google.com/a/answer/33310" },
    { label: "Make a user an admin", href: "https://support.google.com/a/answer/172176" },
  ],
} as const;

/* ── the sections ───────────────────────────────────────────────────── */

export const SECTIONS: Section[] = [
  {
    id: "communication",
    noun: "team communication",
    title: "Communication",
    tools: [
      {
        id: "slack",
        name: "Slack",
        role: "Workspace Admin",
        steps: [
          "Click your workspace name, then Invite people, and invite {invite}.",
          "Once Tyler joins, open Tools & settings, then Manage members.",
          "Find Tyler, click the three dots, choose Change account type, and pick Workspace Admin.",
        ],
        docs: {
          label: "Change a member's role",
          href: "https://slack.com/help/articles/218124397",
        },
      },
      {
        id: "whatsapp",
        name: "WhatsApp",
        role: "Group admin",
        note: "WhatsApp goes by phone number, so add {phone} to each group.",
        steps: [
          "Open each group Tyler should be in and tap the group name.",
          "Tap Add member and add {phone}.",
          "Tap Tyler in the member list and choose Make group admin.",
          "Repeat for every group, including client groups.",
        ],
      },
      {
        id: "discord",
        name: "Discord",
        role: "Administrator role",
        steps: [
          "Create an invite link to your server and email it to {invite}.",
          "Open Server Settings, then Roles, and create a role with Administrator turned on.",
          "Once Tyler joins, give that role to Tyler.",
        ],
      },
    ],
  },
  {
    id: "payments",
    noun: "taking payments",
    title: "Payments",
    tools: [
      {
        id: "fanbasis",
        name: "Fanbasis / Commas",
        role: "Admin",
        steps: [
          "Open your settings and find Team or Team Members.",
          "Invite {invite} and give it the Admin role.",
        ],
      },
      {
        id: "whop",
        name: "Whop",
        role: "Admin",
        steps: [
          "In your Whop dashboard, open Settings, then Team.",
          "Add {invite} as a team member with the Admin role.",
        ],
      },
      {
        id: "stripe",
        name: "Stripe",
        role: "Administrator",
        steps: [
          "Open Settings, then Team and security.",
          "Click Add member and enter {invite}.",
          "Pick the Administrator role and send the invite.",
        ],
        docs: { label: "Stripe teams", href: "https://docs.stripe.com/get-started/account/teams" },
      },
    ],
  },
  {
    id: "crm",
    noun: "your CRM",
    title: "CRM",
    tools: [
      {
        id: "ghl",
        name: "GoHighLevel",
        role: "Sub-account Admin",
        steps: [
          "Open the sub-account, then Settings, then Team (older accounts call it My Staff).",
          "Add an employee with the email {invite}.",
          "Set User Type to Account and User Role to Admin, and leave every permission on.",
        ],
      },
      {
        id: "hubspot",
        name: "HubSpot",
        role: "Super Admin",
        steps: [
          "Click the settings gear, then Users & Teams.",
          "Click Create user and enter {invite}.",
          "Choose Super Admin and send the invite.",
        ],
      },
      {
        id: "close",
        name: "Close",
        role: "Admin",
        steps: [
          "Open Settings, then Team Management.",
          "Invite {invite} and give it the Admin role.",
        ],
      },
    ],
  },
  {
    id: "meetings",
    noun: "meetings",
    title: "Meetings",
    tools: [
      {
        id: "zoom",
        name: "Zoom",
        role: "Admin",
        paid: true,
        steps: [
          "Sign in at zoom.us and open User Management, then Users.",
          "Click Add Users, enter {invite}, and set the type to Licensed.",
          "Open User Management, then Roles, and add Tyler to the Admin role.",
        ],
      },
      {
        id: "meet",
        name: "Google Meet",
        role: "Admin",
        note: "Meet runs on your Google Workspace. If you finished step 01, this is already done.",
        steps: ["Finish the Google Workspace step at the top. That covers Meet."],
      },
    ],
  },
  {
    id: "recording",
    noun: "recording sales calls",
    title: "Call recording",
    tools: [
      {
        id: "fathom",
        name: "Fathom",
        role: "Admin",
        paid: true,
        steps: [
          "Open Settings, then Team.",
          "Invite {invite} and make it an Admin.",
          "Make sure call recordings are shared with the team.",
        ],
      },
      {
        id: "otter",
        name: "Otter",
        role: "Workspace Admin",
        note: "Otter only has admins on its Business plan.",
        steps: [
          "Open your workspace settings, then Members.",
          "Invite {invite} and set the role to Admin.",
        ],
      },
      {
        id: "fireflies",
        name: "Fireflies",
        role: "Admin",
        steps: [
          "Open Team, then Members.",
          "Invite {invite} and make it an Admin.",
        ],
      },
      {
        id: "tldv",
        name: "tl;dv",
        role: "Admin",
        steps: [
          "Open Settings, then your workspace's Members.",
          "Invite {invite} and set the role to Admin.",
        ],
      },
    ],
  },
  {
    id: "calendar",
    noun: "booking calls",
    title: "Calendar",
    tools: [
      {
        id: "gcal",
        name: "Google Calendar",
        role: "Make changes and manage sharing",
        note: "Company calendars are covered by step 01. Personal calendars that take bookings need sharing on their own.",
        steps: [
          "Open Google Calendar and hover the calendar, then click the three dots, then Settings and sharing.",
          "Under Share with specific people, add {invite}.",
          "Set it to Make changes and manage sharing.",
        ],
      },
      {
        id: "calendly",
        name: "Calendly",
        role: "Admin",
        steps: [
          "Open Admin center, then Users.",
          "Invite {invite} and set the role to Admin.",
        ],
      },
      {
        id: "ghlcal",
        name: "GHL Calendar",
        role: "Sub-account Admin",
        note: "This comes with GoHighLevel admin access in the CRM section.",
        steps: ["Give Tyler admin in GoHighLevel (CRM section). That covers its calendars."],
      },
      {
        id: "iclosed",
        name: "iClosed",
        role: "Admin",
        steps: [
          "Open Settings, then Team.",
          "Invite {invite} and give it the Admin role.",
        ],
      },
      {
        id: "calcom",
        name: "Cal.com",
        role: "Admin",
        steps: [
          "Open Teams, then your team, then Members.",
          "Invite {invite} and set the role to Admin.",
        ],
      },
    ],
  },
  {
    id: "automation",
    noun: "automations",
    title: "Automation",
    tools: [
      {
        id: "zapier",
        name: "Zapier",
        role: "Admin",
        paid: true,
        steps: [
          "Open Settings, then Members.",
          "Invite {invite} and set the role to Admin.",
          "Share the folders that hold your Zaps with the team.",
        ],
      },
      {
        id: "make",
        name: "Make",
        role: "Organization Admin",
        steps: [
          "Open your organization, then Users.",
          "Invite {invite} and give it the Admin role.",
          "Add Tyler to every team that holds scenarios.",
        ],
      },
      {
        id: "n8n",
        name: "n8n",
        role: "Admin",
        note: "n8n Cloud only has an Admin role on its paid plans.",
        steps: [
          "Open Settings, then Users.",
          "Invite {invite}.",
          "Change Tyler's role to Admin.",
        ],
        docs: { label: "n8n user management", href: "https://docs.n8n.io/user-management/" },
      },
    ],
  },
];
