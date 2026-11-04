import { SECTIONS, TYLER, WORKSPACE, otherTool, type Section, type Tool } from "./catalog";

/**
 * The client's answers, and the one function that turns them into the access
 * list: what is green, what is red, and why.
 *
 * Everything the page colours and everything Tyler is sent comes out of
 * `summarize`, so the screen and the email can never disagree about whether
 * something is done.
 */

/* "login": the client sent Tyler the login on Slack (tools with slackLogin) */
export type Status = "admin" | "login" | "partial" | "none" | "unsure";

export const STATUS_OPTIONS: { id: Status; label: string }[] = [
  { id: "admin", label: "Yes, admin" },
  { id: "partial", label: "Has access, not admin" },
  { id: "none", label: "No access" },
  { id: "unsure", label: "Not sure" },
];

export type ToolAnswer = {
  status?: Status;
  paid?: "yes" | "no";
  note?: string;
};

export type SectionAnswer = {
  picked: string[];
  /** what they typed for Other */
  otherName?: string;
  /** "We don't use one" */
  none?: boolean;
  tools: Record<string, ToolAnswer>;
};

/* "missing" is no longer offered; kept so older records still read */
export type WorkspaceStatus = "done" | "notyet" | "missing";

/* ── part 2: the business ────────────────────────────────────────────── */

export type Offer = {
  id: string;
  name?: string;
  price?: string;
  /** paid in full, splits, deposits */
  payment?: string;
  /** e.g. 12 weeks */
  length?: string;
  /** who it's for */
  audience?: string;
  deliverables?: string;
};

export type Business = {
  leadSources?: string[];
  leadOther?: string;
  /** how leads get booked, and who does it */
  setting?: string;
  /** what happens from booking to close */
  booked?: string;
  offers?: Offer[];
  /** what they deliver after the sale, and who delivers it */
  fulfillment?: string;
};

export const LEAD_SOURCES = [
  "FB / IG ads",
  "Organic social",
  "YouTube",
  "SEO",
  "Webinar",
  "Cold email",
  "Cold DM",
  "Referrals",
  "Other",
] as const;

export const OFFER_FIELDS: { key: Exclude<keyof Offer, "id">; label: string; long?: boolean; placeholder: string }[] = [
  { key: "name", label: "Offer name", placeholder: "e.g. 1:1 Scale Program" },
  { key: "price", label: "Price", placeholder: "e.g. $6,000" },
  { key: "payment", label: "Payment options", placeholder: "e.g. PIF, or 3 × $2,200" },
  { key: "length", label: "Program length", placeholder: "e.g. 12 weeks" },
  { key: "audience", label: "Who it's for", long: true, placeholder: "Who buys this, and who shouldn't" },
  { key: "deliverables", label: "Deliverables", long: true, placeholder: "Everything they get: calls, community, templates, support…" },
];

export const newOffer = (): Offer => ({ id: Math.random().toString(36).slice(2, 10) });

const filled = (v: unknown) => typeof v === "string" && v.trim().length > 0;

/** what part 2 still needs, as {label, anchor} so the page can link to it */
export function businessMissing(b: Business | undefined): { label: string; anchor: string }[] {
  const out: { label: string; anchor: string }[] = [];
  const src = b?.leadSources ?? [];
  if (!src.length || (src.includes("Other") && !filled(b?.leadOther))) {
    out.push({ label: "Lead sources", anchor: "biz-leads" });
  }
  if (!filled(b?.setting)) out.push({ label: "How calls get booked", anchor: "biz-setting" });
  if (!filled(b?.booked)) out.push({ label: "After a call is booked", anchor: "biz-booked" });
  const offers = b?.offers ?? [];
  if (!offers.length) out.push({ label: "Offers", anchor: "biz-offers" });
  offers.forEach((o, i) => {
    const gaps = OFFER_FIELDS.filter((f) => !filled(o[f.key]));
    if (gaps.length) out.push({ label: `Offer ${i + 1}: ${gaps.map((g) => g.label.toLowerCase()).join(", ")}`, anchor: `offer-${o.id}` });
  });
  if (!filled(b?.fulfillment)) out.push({ label: "What you deliver", anchor: "biz-fulfillment" });
  return out;
}

/** the five part-2 questions, for the progress count */
export const BUSINESS_STEPS = 5;
export function businessDone(b: Business | undefined): number {
  const missing = new Set(businessMissing(b).map((m) => m.anchor.startsWith("offer-") ? "biz-offers" : m.anchor));
  return ["biz-leads", "biz-setting", "biz-booked", "biz-offers", "biz-fulfillment"].filter((a) => !missing.has(a)).length;
}

export type Answers = {
  business?: Business;
  workspace: {
    status?: WorkspaceStatus;
    /** the address they created, e.g. team@acme.com */
    email?: string;
    note?: string;
  };
  sections: Record<string, SectionAnswer>;
};

export type Client = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  website: string;
};

export type OnboardingRecord = {
  id: string;
  client: Client;
  answers: Answers;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
};

export const emptyAnswers = (): Answers => ({
  workspace: {},
  sections: {},
});

export const sectionAnswer = (a: Answers, id: string): SectionAnswer =>
  a.sections[id] ?? { picked: [], tools: {} };

/** "https://www.acme.com/about" → "acme.com" */
export function domainOf(website: string): string {
  return website
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}

/** every invite after step 01 goes to the team@ user they created */
export function inviteAddress(a: Answers, client: Client): string {
  const typed = (a.workspace.email ?? "").trim();
  if (typed) return typed;
  const d = domainOf(client.website);
  return d ? `team@${d}` : "team@yourcompany.com";
}

/** fill {invite} and {phone} in a step */
export const fill = (s: string, invite: string) =>
  s.replaceAll("{invite}", invite).replaceAll("{phone}", TYLER.phone);

/** the Tool objects behind a section's picks, Other included */
export function pickedTools(section: Section, sa: SectionAnswer): Tool[] {
  return sa.picked.map((id) =>
    id === `${section.id}:other`
      ? otherTool(section.id, sa.otherName ?? "")
      : (section.tools.find((t) => t.id === id) as Tool)
  ).filter(Boolean);
}

/* ── the access list ────────────────────────────────────────────────── */

/**
 * green: Tyler is admin.  red: Tyler is not, or the plan is wrong.
 * amber: they don't use anything for this.  todo: not answered yet.
 */
export type Flag = "green" | "red" | "amber" | "todo";

export type Item = {
  /** element id on the page, for "jump to"; not sent anywhere that needs it */
  anchor?: string;
  section: string;
  tool: string;
  role: string;
  flag: Flag;
  /** the answer, in words */
  answer: string;
  /** why it is red, when it is */
  reason?: string;
  note?: string;
};

export const LOGIN_OPTION: { id: Status; label: string } = {
  id: "login",
  label: "Sent Tyler the login on Slack",
};

/** the answers a tool offers: the four, plus the Slack login where allowed */
export const statusOptions = (tool: Tool) =>
  tool.slackLogin ? [STATUS_OPTIONS[0], LOGIN_OPTION, ...STATUS_OPTIONS.slice(1)] : STATUS_OPTIONS;

const STATUS_LABEL: Record<Status, string> = Object.fromEntries(
  [...STATUS_OPTIONS, LOGIN_OPTION].map((o) => [o.id, o.label])
) as Record<Status, string>;

/**
 * A missing paid plan is not a blocker for the client: they are told "we'll
 * need that" and it reaches Tyler as amber. Missing admin is red.
 */
export function toolFlag(tool: Tool, ans: ToolAnswer | undefined): { flag: Flag; reason?: string } {
  if (!ans?.status) return { flag: "todo" };
  if (tool.paid && !ans.paid) return { flag: "todo" };
  const unpaid = tool.paid && ans.paid === "no";
  const also = unpaid ? ", and needs a paid plan" : "";
  if (ans.status === "partial") return { flag: "red", reason: `Tyler is not ${tool.role}${also}` };
  if (ans.status === "none") return { flag: "red", reason: `Tyler has no access${also}` };
  if (ans.status === "unsure") return { flag: "red", reason: `Not confirmed${also}` };
  if (unpaid) return { flag: "amber", reason: "Needs a paid plan" };
  return { flag: "green" };
}

/** step 01 is a single toggle that starts as "Not yet" */
export function workspaceItem(a: Answers): Item {
  const w = a.workspace;
  const base = { anchor: "sec-ws", section: "Workspace", tool: WORKSPACE.title, role: "Super Admin", note: w.note };
  if (w.status === "done") {
    const email = (w.email ?? "").trim();
    return { ...base, flag: "green", answer: email ? `Created ${email}` : "Done" };
  }
  return { ...base, flag: "red", answer: "Not yet", reason: "No team@ login yet" };
}

export function summarize(a: Answers): Item[] {
  const items: Item[] = [workspaceItem(a)];
  for (const section of SECTIONS) {
    const sa = sectionAnswer(a, section.id);
    if (sa.none) {
      items.push({
        anchor: `sec-${section.id}`,
        section: section.title,
        tool: "None",
        role: "",
        flag: "amber",
        answer: "Doesn't use one yet",
      });
      continue;
    }
    const tools = pickedTools(section, sa);
    if (!tools.length) {
      items.push({
        anchor: `sec-${section.id}`,
        section: section.title,
        tool: "Not picked yet",
        role: "",
        flag: "todo",
        answer: "",
      });
      continue;
    }
    for (const tool of tools) {
      const ans = sa.tools[tool.id];
      const { flag, reason } = toolFlag(tool, ans);
      const parts = [ans?.status ? STATUS_LABEL[ans.status] : "Not answered"];
      if (tool.paid && ans?.paid) parts.push(ans.paid === "yes" ? "paid plan" : "not paid");
      items.push({
        anchor: `tool-${tool.id}`,
        section: section.title,
        tool: tool.name,
        role: tool.role,
        flag,
        answer: flag === "amber" ? `${parts[0]}, needs a paid plan` : parts.join(", "),
        reason,
        note: ans?.note?.trim() || undefined,
      });
    }
  }
  return items;
}

/** a section is answered once every tool in it has an answer */
export function sectionDone(section: Section, a: Answers): boolean {
  const sa = sectionAnswer(a, section.id);
  if (sa.none) return true;
  const tools = pickedTools(section, sa);
  return tools.length > 0 && tools.every((t) => toolFlag(t, sa.tools[t.id]).flag !== "todo");
}
