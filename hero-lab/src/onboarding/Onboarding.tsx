import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GridBackdrop from "../components/GridBackdrop";
import { ACCENTS, applyAccent } from "../accents";
import { SECTIONS, TYLER, WORKSPACE, type Section, type Tool } from "./catalog";
import {
  BUSINESS_STEPS,
  LEAD_SOURCES,
  OFFER_FIELDS,
  STATUS_OPTIONS,
  businessDone,
  businessMissing,
  newOffer,
  emptyAnswers,
  fill,
  inviteAddress,
  domainOf,
  pickedTools,
  sectionAnswer,
  sectionDone,
  summarize,
  toolFlag,
  type Answers,
  type Business,
  type Client,
  type Offer,
  type Flag,
  type Item,
  type OnboardingRecord,
  type SectionAnswer,
  type ToolAnswer,
} from "./model";
import "../card/card.css";
import "../apply/apply.css";
import "./onboarding.css";

/**
 * jtylerray.com/client-onboarding — the access checklist a new client works
 * through.
 *
 * Two screens. Without ?c= it is the start form, which creates a record and
 * sends the client their private link. With ?c=<id> it is their checklist.
 *
 * The record lives server-side (api/onboarding.ts, Upstash Redis), so the
 * client can start on a phone and finish on a laptop. A copy is kept in
 * localStorage too: a save that fails (offline, function down) is not lost,
 * and it is pushed again the next time the page loads.
 *
 * Drawn in the card's language, like /apply: card.css for structure, apply.css
 * for the lifted contrast, onboarding.css for what only this page has.
 */

const ENDPOINT = "/api/onboarding";
const LAST_KEY = "onb:last";
const localKey = (id: string) => `onb:${id}`;

type Local = { answers: Answers; updatedAt: string; dirty: boolean };

function readLocal(id: string): Local | null {
  try {
    const raw = localStorage.getItem(localKey(id));
    return raw ? (JSON.parse(raw) as Local) : null;
  } catch {
    return null;
  }
}
function writeLocal(id: string, v: Local) {
  try {
    localStorage.setItem(localKey(id), JSON.stringify(v));
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* private mode or full storage: the server copy still stands */
  }
}
function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

async function call<T>(init: RequestInit & { query?: string }): Promise<T> {
  const res = await fetch(ENDPOINT + (init.query ?? ""), {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

export default function Onboarding() {
  useEffect(() => {
    document.title = "Client Onboarding · J. Tyler Ray";
    document.documentElement.setAttribute("data-style", "blueprint");
    const forest = ACCENTS.find((a) => a.id === "green") ?? ACCENTS[0];
    applyAccent(forest.hex, forest.gradient, forest.text);
  }, []);

  const [id, setId] = useState(() => new URLSearchParams(location.search).get("c"));

  const begin = (newId: string) => {
    history.replaceState(null, "", `${location.pathname}?c=${encodeURIComponent(newId)}`);
    setId(newId);
  };

  return (
    <div className="card-page" data-mark="color" data-eyebrow="wide">
      <GridBackdrop cell={48} crosshairs={4} ticks={false} interactive={false} />
      <div className="corners" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <main className="card apply onb">
        {id ? <Checklist id={id} /> : <Start onStarted={begin} />}

        <footer className="card-foot">
          <a className="card-site mono" href="https://jtylerray.com">
            jtylerray.com
          </a>
          <span className="mono card-year">2026</span>
        </footer>
      </main>
    </div>
  );
}

/* ── shared bits ────────────────────────────────────────────────────── */

function Contact() {
  return (
    <aside className="onb-contact" aria-label="Contact Tyler">
      <p className="onb-contact-l mono">Stuck? Text me</p>
      <a className="onb-phone" href={`sms:${TYLER.phoneHref}`}>
        {TYLER.phone}
      </a>
      <p className="onb-contact-t">
        Text me now so I have your number. If something breaks, I'll text you back. Email
        works too: <a href={`mailto:${TYLER.email}`}>{TYLER.email}</a>
      </p>
    </aside>
  );
}

function NoPasswords() {
  return (
    <p className="onb-warn">
      Never put a password in this form, an email or a text. The one login I need goes through
      a one-time link, and step 01 shows you how.
    </p>
  );
}

/* ── the start screen ───────────────────────────────────────────────── */

function Start({ onStarted }: { onStarted: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const last = useMemo(readLast, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    setError("");
    try {
      const { id } = await call<{ id: string }>({
        method: "POST",
        body: JSON.stringify({ action: "start", ...data }),
      });
      onStarted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <>
      <header className="card-head">
        <p className="mono card-eyebrow">Client onboarding</p>
        <h1 className="card-name">Let's get me into your tools.</h1>
        <p className="apply-lede">
          This builds a checklist of every tool I need admin access to. It saves as you go, and
          you'll get a private link so you can finish later on any device.
        </p>
      </header>

      {last && (
        <a className="btn btn-ghost onb-resume" href={`?c=${encodeURIComponent(last)}`}>
          Continue where you left off
        </a>
      )}

      <section className="blk" aria-labelledby="blk-start">
        <header className="blk-head">
          <h2 className="blk-title" id="blk-start">
            Start new onboarding
          </h2>
          <span className="blk-sub mono">Takes a minute</span>
        </header>

        <form className="form" onSubmit={onSubmit}>
          <div className="field-pair">
            <Field name="firstName" label="First name" autoComplete="given-name" />
            <Field name="lastName" label="Last name" autoComplete="family-name" />
          </div>
          <div className="field-pair">
            <Field name="email" label="Email" type="email" autoComplete="email" />
            <Field name="phone" label="Phone" type="tel" autoComplete="tel" />
          </div>
          <div className="field-pair">
            <Field name="company" label="Company name" autoComplete="organization" />
            <Field
              name="website"
              label="Company website"
              placeholder="acme.com"
              autoComplete="url"
              inputMode="url"
            />
          </div>

          <input
            className="field-hp"
            name="fax"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {error && (
            <p className="form-err" role="alert">
              {error}. Text me at {TYLER.phone} if it keeps happening.
            </p>
          )}

          <button className="btn btn-fill form-send" type="submit" disabled={busy}>
            {busy ? "Starting…" : "Start onboarding"}
          </button>
        </form>
      </section>

      <NoPasswords />
    </>
  );
}

function Field(props: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const { label, ...rest } = props;
  return (
    <label className="field">
      <span className="field-l mono">{label}</span>
      <input className="field-i" type="text" required {...rest} />
    </label>
  );
}

/* ── the checklist ──────────────────────────────────────────────────── */

type Save = "saved" | "saving" | "offline";

function Checklist({ id }: { id: string }) {
  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [loadError, setLoadError] = useState("");
  const [save, setSave] = useState<Save>("saved");
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(answers);

  /* load: the server's record, unless this browser holds newer edits that
     never reached it */
  useEffect(() => {
    let live = true;
    call<{ record: OnboardingRecord }>({ method: "GET", query: `?id=${encodeURIComponent(id)}` })
      .then(({ record }) => {
        if (!live) return;
        const local = readLocal(id);
        const useLocal = local?.dirty && local.updatedAt > record.updatedAt;
        const a = { ...emptyAnswers(), ...(useLocal ? local!.answers : record.answers) };
        setRecord(record);
        setAnswers(a);
        latest.current = a;
        writeLocal(id, { answers: a, updatedAt: record.updatedAt, dirty: !!useLocal });
        if (useLocal) push(a);
      })
      .catch((err) => live && setLoadError(err instanceof Error ? err.message : String(err)));
    return () => {
      live = false;
    };
    // push is stable for a given id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const push = useCallback(
    async (a: Answers, keepalive = false) => {
      setSave("saving");
      try {
        const { updatedAt } = await call<{ updatedAt: string }>({
          method: "PUT",
          body: JSON.stringify({ id, answers: a, summary: summarize(a) }),
          // lets the save finish after the tab is closed or backgrounded
          keepalive,
        });
        // a newer edit may have landed while this was in flight
        if (latest.current === a) {
          writeLocal(id, { answers: a, updatedAt, dirty: false });
          setSave("saved");
        }
      } catch {
        setSave("offline");
      }
    },
    [id]
  );

  const update = useCallback(
    (fn: (a: Answers) => Answers) => {
      setAnswers((prev) => {
        const next = fn(prev);
        latest.current = next;
        writeLocal(id, { answers: next, updatedAt: new Date().toISOString(), dirty: true });
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          timer.current = undefined;
          push(next);
        }, 700);
        return next;
      });
      setSave("saving");
    },
    [id, push]
  );

  /* An edit typed in the last 700ms would be lost if the tab closed before
     the debounce fired, so a pending save is sent the moment the page is
     hidden. A save that failed offline is retried when the network returns. */
  useEffect(() => {
    const flush = () => {
      if (timer.current === undefined) return;
      window.clearTimeout(timer.current);
      timer.current = undefined;
      push(latest.current, true);
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    const onOnline = () => readLocal(id)?.dirty && push(latest.current);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", onOnline);
    };
  }, [id, push]);

  if (loadError) {
    return (
      <>
        <header className="card-head">
          <p className="mono card-eyebrow">Client onboarding</p>
          <h1 className="card-name">That link didn't load.</h1>
          <p className="apply-lede">
            {loadError}. Check the link in your email, or text me and I'll sort it out.
          </p>
        </header>
        <Contact />
        <a className="btn btn-ghost onb-resume" href={location.pathname}>
          Start new onboarding
        </a>
      </>
    );
  }

  if (!record) {
    return (
      <header className="card-head">
        <p className="mono card-eyebrow">Client onboarding</p>
        <h1 className="card-name">Loading…</h1>
      </header>
    );
  }

  return (
    <ChecklistBody
      record={record}
      answers={answers}
      update={update}
      save={save}
      onSubmitted={(submittedAt) => setRecord({ ...record, submittedAt })}
    />
  );
}

type Update = (fn: (a: Answers) => Answers) => void;

function ChecklistBody({
  record,
  answers,
  update,
  save,
  onSubmitted,
}: {
  record: OnboardingRecord;
  answers: Answers;
  update: Update;
  save: Save;
  onSubmitted: (submittedAt: string) => void;
}) {
  const { client } = record;
  const invite = inviteAddress(answers, client);
  const items = useMemo(() => summarize(answers), [answers]);
  const missing = useMemo(() => businessMissing(answers.business), [answers.business]);
  const blockers: Blocker[] = [
    ...items
      .filter((i) => i.flag === "todo")
      .map((i) => ({ label: i.tool === "Not picked yet" ? i.section : i.tool, anchor: i.anchor ?? "" })),
    ...missing,
  ];
  const total = items.length + BUSINESS_STEPS;
  const wsPending = answers.workspace.status !== "done";
  // step 01 counts once it is done, not while it sits at "Not yet"
  const answered =
    items.filter((i) => i.flag !== "todo").length - (wsPending ? 1 : 0) + businessDone(answers.business);
  /* step 01 is not a send blocker, but while it is "Not yet" it is the
     next thing to do: everything else depends on that login */
  const next: Blocker | undefined = wsPending
    ? { label: "Workspace login", anchor: "sec-ws" }
    : blockers[0];

  return (
    <>
      <header className="card-head">
        <p className="mono card-eyebrow">{client.company} onboarding</p>
        <h1 className="card-name">Hi {client.firstName}.</h1>
        <p className="apply-lede">
          Two parts: access to your tools, then a few questions about your business. Everything
          saves as you go, so you can leave and come back from your link.
        </p>
      </header>

      {record.submittedAt && (
        <p className="onb-sent">
          Sent to Tyler on {new Date(record.submittedAt).toLocaleDateString()}. You can still
          change anything and send an update.
        </p>
      )}

      <LinkBox id={record.id} />

      <PartHead n={1} title="Access to your tools" />
      <WorkspaceStep answers={answers} update={update} client={client} />
      {SECTIONS.map((s, i) => (
        <SectionBlock
          key={s.id}
          n={i + 2}
          section={s}
          answers={answers}
          update={update}
          invite={invite}
        />
      ))}

      <PartHead n={2} title="Your business" />
      <BusinessPart business={answers.business ?? {}} update={update} />

      <AccessList items={items} />
      <Submit
        record={record}
        answers={answers}
        items={items}
        blockers={blockers}
        onSubmitted={onSubmitted}
      />
      <NoPasswords />

      <NextBar answered={answered} total={total} save={save} next={next} />
    </>
  );
}

type Blocker = { label: string; anchor: string };

function jump(anchor: string) {
  const el = document.getElementById(anchor);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PartHead({ n, title }: { n: number; title: string }) {
  return (
    <div className="onb-part">
      <p className="mono onb-part-n">Part {n} of 2</p>
      <p className="onb-part-t">{title}</p>
    </div>
  );
}

/** pinned to the bottom: how far along, whether it saved, and one tap to the next gap */
function NextBar({
  answered,
  total,
  save,
  next,
}: {
  answered: number;
  total: number;
  save: Save;
  next: Blocker | undefined;
}) {
  return (
    <div className="onb-nextbar" role="region" aria-label="Progress">
      <div className="onb-nextbar-in">
        <p className="onb-nextbar-t mono">
          <span>
            {answered}/{total} answered
          </span>
          <span className={`onb-save is-${save}`} aria-live="polite">
            {save === "saved" ? "Saved" : save === "saving" ? "Saving…" : "Offline, saved here"}
          </span>
        </p>
        <button
          type="button"
          className="btn btn-fill onb-nextbar-b"
          onClick={() => jump(next ? next.anchor : "blk-send")}
        >
          {next ? `Next: ${next.label}` : "Ready to send"}
        </button>
      </div>
    </div>
  );
}

/** the private link and the phone number, in one panel, so the first
    question is on the first screen of a phone */
function LinkBox({ id }: { id: string }) {
  const url = `${location.origin}${location.pathname}?c=${encodeURIComponent(id)}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="onb-link">
      <div className="onb-link-row">
        <input
          className="field-i onb-link-i"
          readOnly
          value={url}
          aria-label="Your private link"
          onFocus={(e) => e.target.select()}
        />
        <button
          className="btn btn-ghost onb-copy"
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(url).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              },
              () => {}
            )
          }
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="onb-contact-t">Your private link. It's in your email too, so keep it to yourself.</p>
      <p className="onb-stuck">
        Stuck? Text me{" "}
        <a className="onb-stuck-n" href={`sms:${TYLER.phoneHref}`}>
          {TYLER.phone}
        </a>
      </p>
    </div>
  );
}

/* ── 01 · workspace ─────────────────────────────────────────────────── */

function WorkspaceStep({
  answers,
  update,
  client,
}: {
  answers: Answers;
  update: Update;
  client: Client;
}) {
  const w = answers.workspace;
  const suggested = `team@${domainOf(client.website) || "yourcompany.com"}`;
  const setW = (patch: Partial<Answers["workspace"]>) =>
    update((a) => ({ ...a, workspace: { ...a.workspace, ...patch } }));
  const done = w.status === "done";
  // neutral until done: red on arrival reads as an error the client made
  const flag = done ? "green" : "todo";

  return (
    <section className="blk onb-sec" aria-labelledby="sec-ws">
      <header className="blk-head">
        <span className="blk-sub mono">01 · Start here</span>
        <h2 className="blk-title" id="sec-ws">
          Google Workspace Login
        </h2>
      </header>

      <div className={`onb-tool is-${flag}`}>
        <p className="onb-p onb-p-first">
          Start by creating a <strong>{suggested}</strong> Google Workspace email and make it a
          Super Admin. Then send me the login.
        </p>

        <HowTo>
          <ol className="onb-steps">
            {WORKSPACE.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="onb-note">
            This adds one user to your Workspace bill. When I first sign in I'll change the
            password and put two-step verification on my phone.
          </p>
          <p className="onb-docs">
            {WORKSPACE.docs.map((d) => (
              <a key={d.href} href={d.href} target="_blank" rel="noreferrer">
                {d.label} ↗
              </a>
            ))}
          </p>
        </HowTo>

        <button
          type="button"
          className={done ? "onb-toggle is-on" : "onb-toggle"}
          aria-pressed={done}
          onClick={() =>
            setW(done ? { status: "notyet" } : { status: "done", email: w.email || suggested })
          }
        >
          <span className="onb-toggle-box" aria-hidden="true">
            {done ? "✓" : ""}
          </span>
          {done ? "Done" : "Not yet"}
        </button>
        {!done && <p className="onb-note">Tap it once the login is set up and sent.</p>}

        {done && (
          <label className="field">
            <span className="field-l mono">The address you created</span>
            <input
              className="field-i"
              type="email"
              placeholder={suggested}
              value={w.email ?? ""}
              onChange={(e) => setW({ email: e.target.value })}
            />
          </label>
        )}

        <Notes value={w.note} onChange={(note) => setW({ note })} />
      </div>
    </section>
  );
}

/* ── 02+ · the tool sections ────────────────────────────────────────── */

function SectionBlock({
  n,
  section,
  answers,
  update,
  invite,
}: {
  n: number;
  section: Section;
  answers: Answers;
  update: Update;
  invite: string;
}) {
  const sa = sectionAnswer(answers, section.id);
  const otherId = `${section.id}:other`;
  const tools = pickedTools(section, sa);
  const done = sectionDone(section, answers);

  const setSA = (fn: (s: SectionAnswer) => SectionAnswer) =>
    update((a) => ({
      ...a,
      sections: { ...a.sections, [section.id]: fn(sectionAnswer(a, section.id)) },
    }));

  const toggle = (toolId: string) =>
    setSA((s) => ({
      ...s,
      none: false,
      picked: s.picked.includes(toolId)
        ? s.picked.filter((p) => p !== toolId)
        : [...s.picked, toolId],
    }));

  const setTool = (toolId: string, patch: Partial<ToolAnswer>) =>
    setSA((s) => ({ ...s, tools: { ...s.tools, [toolId]: { ...s.tools[toolId], ...patch } } }));

  const pad = String(n).padStart(2, "0");

  return (
    <section className="blk onb-sec" aria-labelledby={`sec-${section.id}`}>
      <header className="blk-head">
        <span className="blk-sub mono">
          {pad} · {done ? "Answered" : "To do"}
        </span>
        <h2 className="blk-title" id={`sec-${section.id}`}>
          {section.title}
        </h2>
      </header>

      <p className="onb-q">
        {section.question ?? `What do you use for ${section.noun}? Pick all that apply.`}
      </p>
      <div className="onb-chips" role="group" aria-label={`${section.title} tools`}>
        {section.tools.map((t) => (
          <Chip key={t.id} on={sa.picked.includes(t.id)} onClick={() => toggle(t.id)}>
            {t.name}
          </Chip>
        ))}
        <Chip on={sa.picked.includes(otherId)} onClick={() => toggle(otherId)}>
          Other
        </Chip>
        <Chip
          on={!!sa.none}
          onClick={() => setSA((s) => ({ ...s, none: !s.none, picked: s.none ? s.picked : [] }))}
        >
          {section.noneLabel ?? "We don't use one"}
        </Chip>
      </div>

      {sa.picked.includes(otherId) && (
        <label className="field onb-other">
          <span className="field-l mono">What's it called?</span>
          <input
            className="field-i"
            type="text"
            value={sa.otherName ?? ""}
            onChange={(e) => setSA((s) => ({ ...s, otherName: e.target.value }))}
          />
        </label>
      )}

      {tools.length > 1 && (
        <p className="onb-p">
          Got it, {tools.length} tools. I need admin in every one of them.
        </p>
      )}

      {tools.map((t) => (
        <ToolCard
          key={t.id}
          tool={t}
          ans={sa.tools[t.id]}
          invite={invite}
          onChange={(patch) => setTool(t.id, patch)}
        />
      ))}
    </section>
  );
}

function ToolCard({
  tool,
  ans,
  invite,
  onChange,
}: {
  tool: Tool;
  ans: ToolAnswer | undefined;
  invite: string;
  onChange: (patch: Partial<ToolAnswer>) => void;
}) {
  const { flag } = toolFlag(tool, ans);
  const needsSteps = ans?.status && ans.status !== "admin";

  return (
    <div className={`onb-tool is-${flag}`} id={`tool-${tool.id}`}>
      <div className="onb-tool-head">
        <Dot flag={flag} />
        <h3 className="onb-tool-name">{tool.name}</h3>
      </div>
      {tool.note && (
        <p className="onb-note">
          <Text s={fill(tool.note, invite)} />
        </p>
      )}

      {tool.paid && (
        <>
          <p className="onb-q">Are you on a paid {tool.name} plan?</p>
          <Choice
            name={`${tool.id}-paid`}
            options={[
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
            ]}
            value={ans?.paid}
            onChange={(v) => onChange({ paid: v as ToolAnswer["paid"] })}
          />
          {ans?.paid === "no" && <p className="onb-note onb-ok">Ok, we'll need that.</p>}
        </>
      )}

      <p className="onb-q">
        Is Tyler {/^[aeiou]/i.test(tool.role) ? "an" : "a"} {tool.role} in {tool.name}?
      </p>
      <Choice
        name={`${tool.id}-status`}
        options={STATUS_OPTIONS}
        value={ans?.status}
        onChange={(v) => onChange({ status: v })}
        bad={["partial", "none", "unsure"]}
      />

      {needsSteps && <p className="onb-alert">I need {tool.role} here.</p>}

      {ans?.status !== "admin" && (
        <HowTo>
          <ol className="onb-steps">
            {tool.steps.map((s) => (
              <li key={s}>
                <Text s={fill(s, invite)} />
              </li>
            ))}
          </ol>
          {tool.docs && (
            <p className="onb-docs">
              <a href={tool.docs.href} target="_blank" rel="noreferrer">
                {tool.docs.label} ↗
              </a>
            </p>
          )}
          <p className="onb-note">Once it's done, switch the answer above to "Yes, admin."</p>
        </HowTo>
      )}

      <Notes value={ans?.note} onChange={(note) => onChange({ note })} />
    </div>
  );
}

/* ── the access list and the send ───────────────────────────────────── */

function AccessList({ items }: { items: Item[] }) {
  return (
    <section className="blk" aria-labelledby="blk-list">
      <header className="blk-head">
        <span className="blk-sub mono">Your list</span>
        <h2 className="blk-title" id="blk-list">
          Access checklist
        </h2>
      </header>
      <ul className="onb-list">
        {items.map((it, i) => (
          <li key={i} className={`onb-row is-${it.flag}`}>
            <Dot flag={it.flag} />
            <span className="onb-row-main">
              <span className="onb-row-tool">{it.tool}</span>
              <span className="onb-row-sec mono">{it.section}</span>
            </span>
            <span className="onb-row-why">
              {it.flag === "red" ? it.reason : it.flag === "todo" ? "To do" : it.answer}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Submit({
  record,
  answers,
  items,
  blockers,
  onSubmitted,
}: {
  record: OnboardingRecord;
  answers: Answers;
  items: Item[];
  blockers: Blocker[];
  onSubmitted: (at: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const red = items.filter((i) => i.flag === "red");

  async function send() {
    setBusy(true);
    setError("");
    try {
      const { submittedAt } = await call<{ submittedAt: string }>({
        method: "POST",
        body: JSON.stringify({
          action: "submit",
          id: record.id,
          answers,
          summary: items,
        }),
      });
      setConfirm(false);
      onSubmitted(submittedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="blk onb-send" id="blk-send" aria-label="Send">
      {record.submittedAt && (
        <div className="form-done">
          <p className="form-done-t">Sent.</p>
          <p className="form-done-l">
            I've got your list and I'll check each one. If something's off, I'll text you. Made
            a change since? Send it again and I'll get the update.
          </p>
        </div>
      )}

      {blockers.length > 0 && (
        <div className="onb-blockers">
          <p className="onb-note">
            {blockers.length} left before you can send. Tap one to jump to it:
          </p>
          <ul>
            {blockers.map((b) => (
              <li key={b.anchor + b.label}>
                <button type="button" className="onb-jump" onClick={() => jump(b.anchor)}>
                  {b.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="form-err" role="alert">
          {error}. Your answers are saved. Try again, or text me.
        </p>
      )}

      <button
        className="btn btn-fill form-send"
        type="button"
        disabled={busy || blockers.length > 0}
        onClick={() => (red.length ? setConfirm(true) : send())}
      >
        {busy ? "Sending…" : record.submittedAt ? "Send the update to Tyler" : "Send it to Tyler"}
      </button>

      {confirm && (
        <div className="onb-modal" role="dialog" aria-modal="true" aria-labelledby="onb-confirm">
          <div className="onb-modal-box">
            <h2 className="blk-title" id="onb-confirm">
              Are you sure?
            </h2>
            <p className="onb-p">I still can't do my job in these:</p>
            <ul className="onb-list">
              {red.map((r, i) => (
                <li key={i} className="onb-row is-red">
                  <Dot flag="red" />
                  <span className="onb-row-main">
                    <span className="onb-row-tool">{r.tool}</span>
                  </span>
                  <span className="onb-row-why">{r.reason}</span>
                </li>
              ))}
            </ul>
            <div className="onb-modal-act">
              <button className="btn btn-fill" type="button" onClick={() => setConfirm(false)}>
                Go back and fix
              </button>
              <button className="btn btn-ghost" type="button" disabled={busy} onClick={send}>
                {busy ? "Sending…" : "Send anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── part 2 · the business ──────────────────────────────────────────── */

function BusinessPart({ business: b, update }: { business: Business; update: Update }) {
  const setB = (fn: (b: Business) => Business) =>
    update((a) => ({ ...a, business: fn(a.business ?? {}) }));

  /* there is always at least one offer card on screen. Until something is
     typed in it, it exists only here, so an untouched form saves nothing */
  const offers: Offer[] = b.offers?.length ? b.offers : [{ id: "first" }];
  const setOffer = (i: number, patch: Partial<Offer>) =>
    setB((cur) => {
      // the on-screen first card keeps its id, so the field keeps focus
      const list = cur.offers?.length ? [...cur.offers] : [{ id: "first" }];
      list[i] = { ...list[i], ...patch };
      return { ...cur, offers: list };
    });
  const addOffer = () =>
    setB((cur) => ({
      ...cur,
      offers: [...(cur.offers?.length ? cur.offers : [{ id: "first" }]), newOffer()],
    }));
  const removeOffer = (i: number) =>
    setB((cur) => ({ ...cur, offers: (cur.offers ?? []).filter((_, j) => j !== i) }));

  const sources = b.leadSources ?? [];
  const toggleSource = (src: string) =>
    setB((cur) => {
      const list = cur.leadSources ?? [];
      return {
        ...cur,
        leadSources: list.includes(src) ? list.filter((x) => x !== src) : [...list, src],
      };
    });

  return (
    <>
      <section className="blk onb-sec" aria-labelledby="biz-leads">
        <header className="blk-head">
          <h2 className="blk-title" id="biz-leads">
            Leads
          </h2>
        </header>
        <p className="onb-q">Where do your leads come from? Pick all that apply.</p>
        <div className="onb-chips" role="group" aria-label="Lead sources">
          {LEAD_SOURCES.map((src) => (
            <Chip key={src} on={sources.includes(src)} onClick={() => toggleSource(src)}>
              {src}
            </Chip>
          ))}
        </div>
        {sources.includes("Other") && (
          <TextField
            label="Where else?"
            value={b.leadOther}
            onChange={(v) => setB((cur) => ({ ...cur, leadOther: v }))}
          />
        )}
      </section>

      <section className="blk onb-sec" aria-labelledby="biz-setting">
        <header className="blk-head">
          <h2 className="blk-title" id="biz-setting">
            Setting and closing
          </h2>
        </header>
        <TextField
          long
          label="How do calls get booked, and who books them?"
          placeholder="e.g. setters DM inbound leads on IG and book them from a GHL calendar"
          value={b.setting}
          onChange={(v) => setB((cur) => ({ ...cur, setting: v }))}
        />
        <div id="biz-booked">
          <TextField
            long
            label="What happens after someone books, up to the close?"
            placeholder="Reminders, pre-call videos, who takes the call, follow-up if they don't buy"
            value={b.booked}
            onChange={(v) => setB((cur) => ({ ...cur, booked: v }))}
          />
        </div>
      </section>

      <section className="blk onb-sec" aria-labelledby="biz-offers">
        <header className="blk-head">
          <h2 className="blk-title" id="biz-offers">
            Offers
          </h2>
        </header>
        <p className="onb-p">One card per offer, low ticket and high ticket.</p>
        {offers.map((o, i) => (
          <div className="onb-tool onb-offer" id={`offer-${o.id}`} key={o.id}>
            <div className="onb-tool-head onb-offer-head">
              <h3 className="onb-tool-name">{(o.name ?? "").trim() || `Offer ${i + 1}`}</h3>
              {offers.length > 1 && (
                <button
                  type="button"
                  className="onb-remove"
                  onClick={() => window.confirm("Remove this offer?") && removeOffer(i)}
                >
                  Remove
                </button>
              )}
            </div>
            {OFFER_FIELDS.map((f) => (
              <TextField
                key={f.key}
                long={f.long}
                label={f.label}
                placeholder={f.placeholder}
                value={o[f.key]}
                onChange={(v) => setOffer(i, { [f.key]: v })}
              />
            ))}
          </div>
        ))}
        <button type="button" className="btn btn-ghost onb-add" onClick={addOffer}>
          + Add another offer
        </button>
      </section>

      <section className="blk onb-sec" aria-labelledby="biz-fulfillment">
        <header className="blk-head">
          <h2 className="blk-title" id="biz-fulfillment">
            Fulfillment
          </h2>
        </header>
        <TextField
          long
          label="What do you deliver after the sale, and who on your team delivers it?"
          placeholder="Onboarding call, weekly group calls, community, 1:1 support… and who runs each"
          value={b.fulfillment}
          onChange={(v) => setB((cur) => ({ ...cur, fulfillment: v }))}
        />
        <p className="onb-note">The software you deliver it in goes in Fulfillment platform, in Part 1.</p>
      </section>
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  long,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  long?: boolean;
}) {
  return (
    <label className="field onb-field">
      <span className="onb-field-l">{label}</span>
      {long ? (
        <textarea
          className="field-i field-t"
          rows={4}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="field-i"
          type="text"
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

/* ── controls ───────────────────────────────────────────────────────── */

function Choice<T extends string>({
  name,
  options,
  value,
  onChange,
  bad = [],
}: {
  name: string;
  options: { id: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
  /** answers that mean Tyler still can't work; picked, they show red */
  bad?: T[];
}) {
  return (
    <div className="onb-choice" role="radiogroup">
      {options.map((o) => (
        <label
          key={o.id}
          className={
            value === o.id ? `onb-opt is-on${bad.includes(o.id) ? " is-bad" : ""}` : "onb-opt"
          }
        >
          <input
            type="radio"
            name={name}
            value={o.id}
            checked={value === o.id}
            onChange={() => onChange(o.id)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={on ? "onb-chip is-on" : "onb-chip"} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function Notes({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field onb-notes">
      <span className="field-l mono">Notes</span>
      <textarea
        className="field-i field-t"
        rows={2}
        placeholder="Anything I should know, or any issues you're running into?"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** the steps, closed until asked for */
function HowTo({ children }: { children: React.ReactNode }) {
  return (
    <details className="onb-howto">
      <summary className="onb-howto-s">Don't know how? Click here.</summary>
      <div className="onb-howto-b">{children}</div>
    </details>
  );
}

/** keeps Tyler's number on one line wherever a step mentions it */
function Text({ s }: { s: string }) {
  const parts = s.split(TYLER.phone);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className="onb-nowrap">{TYLER.phone}</span>}
        </span>
      ))}
    </>
  );
}

function Dot({ flag }: { flag: Flag }) {
  return <span className={`onb-dot is-${flag}`} aria-label={flag} />;
}
