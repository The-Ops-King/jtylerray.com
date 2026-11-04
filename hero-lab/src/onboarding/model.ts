import { SECTIONS, TYLER, WORKSPACE, otherTool, type Section, type Tool } from "./catalog";

/**
 * The client's answers, and the one function that turns them into the access
 * list: what is green, what is red, and why.
 *
 * Everything the page colours and everything Tyler is sent comes out of
 * `summarize`, so the screen and the email can never disagree about whether
 * something is done.
 */

export type Status = "admin" | "partial" | "none" | "unsure";

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

export type Answers = {
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

const STATUS_LABEL: Record<Status, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.id, o.label])
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
  const base = { section: "Workspace", tool: WORKSPACE.title, role: "Super Admin", note: w.note };
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
        section: section.title,
        tool: "None",
        role: "",
        flag: "amber",
        answer: "Doesn't use one",
      });
      continue;
    }
    const tools = pickedTools(section, sa);
    if (!tools.length) {
      items.push({ section: section.title, tool: "Not picked yet", role: "", flag: "todo", answer: "" });
      continue;
    }
    for (const tool of tools) {
      const ans = sa.tools[tool.id];
      const { flag, reason } = toolFlag(tool, ans);
      const parts = [ans?.status ? STATUS_LABEL[ans.status] : "Not answered"];
      if (tool.paid && ans?.paid) parts.push(ans.paid === "yes" ? "paid plan" : "not paid");
      items.push({
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
