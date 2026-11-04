import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GridBackdrop from "../components/GridBackdrop";
import { ACCENTS, applyAccent } from "../accents";
import { SECTIONS, TYLER, WORKSPACE, type Section, type Tool } from "./catalog";
import {
  STATUS_OPTIONS,
  emptyAnswers,
  fill,
  inviteAddress,
  domainOf,
  pickedTools,
  sectionAnswer,
  sectionDone,
  summarize,
  toolFlag,
  workspaceItem,
  type Answers,
  type Client,
  type Flag,
  type Item,
  type OnboardingRecord,
  type SectionAnswer,
  type ToolAnswer,
  type WorkspaceStatus,
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
    async (a: Answers) => {
      setSave("saving");
      try {
        const { updatedAt } = await call<{ updatedAt: string }>({
          method: "PUT",
          body: JSON.stringify({ id, answers: a, summary: summarize(a) }),
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
        timer.current = window.setTimeout(() => push(next), 700);
        return next;
      });
      setSave("saving");
    },
    [id, push]
  );

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

  return (
    <>
      <header className="card-head">
        <p className="mono card-eyebrow">{client.company} onboarding</p>
        <h1 className="card-name">Hi {client.firstName}.</h1>
        <p className="apply-lede">
          Work down the list. Anything red means I still don't have admin. Pick it back up any
          time from your link.
        </p>
        <p className={`onb-save mono is-${save}`} aria-live="polite">
          {save === "saved" ? "Saved" : save === "saving" ? "Saving…" : "Saved on this device only, will retry"}
        </p>
      </header>

      <LinkBox id={record.id} />
      <Contact />
      <Progress items={items} />

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

      <AccessList items={items} />
      <Submit record={record} answers={answers} items={items} onSubmitted={onSubmitted} />
      <NoPasswords />
    </>
  );
}

function LinkBox({ id }: { id: string }) {
  const url = `${location.origin}${location.pathname}?c=${encodeURIComponent(id)}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="onb-link">
      <p className="onb-contact-l mono">Your private link</p>
      <div className="onb-link-row">
        <input className="field-i onb-link-i" readOnly value={url} onFocus={(e) => e.target.select()} />
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
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="onb-contact-t">
        It's in your email too. Anyone with this link can see your checklist, so keep it to
        yourself.
      </p>
    </div>
  );
}

function Progress({ items }: { items: Item[] }) {
  const done = items.filter((i) => i.flag === "green" || i.flag === "amber").length;
  const red = items.filter((i) => i.flag === "red").length;
  return (
    <div className="onb-progress" aria-label="Progress">
      <div className="onb-bar">
        <span style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <p className="mono onb-progress-t">
        {done} of {items.length} done
        {red > 0 && <span className="onb-red"> · {red} need admin</span>}
      </p>
    </div>
  );
}

/* ── 01 · workspace ─────────────────────────────────────────────────── */

const WS_OPTIONS: { id: WorkspaceStatus; label: string }[] = [
  { id: "done", label: "Done" },
  { id: "notyet", label: "Not yet" },
  { id: "missing", label: "We don't have Google Workspace" },
];

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
  const flag = workspaceItem(answers).flag;

  return (
    <section className="blk onb-sec" aria-labelledby="sec-ws">
      <header className="blk-head">
        <span className="blk-sub mono">01 · Start here</span>
        <h2 className="blk-title" id="sec-ws">
          A login at your company
        </h2>
      </header>

      <p className="onb-p">
        I work from one account inside your company: <strong>{suggested}</strong>. You own it,
        everything I build stays in your name, and you can switch it off in one click when we're
        done.
      </p>

      <div className={`onb-tool is-${flag}`}>
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

        <p className="onb-q">Is the team@ user set up as Super Admin?</p>
        <Choice
          name="ws"
          options={WS_OPTIONS}
          value={w.status}
          onChange={(v) => setW({ status: v })}
          bad={["notyet", "missing"]}
        />

        {w.status === "done" && (
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
        {w.status === "notyet" && (
          <p className="onb-alert">I need this before anything else. Follow the steps above.</p>
        )}
        {w.status === "missing" && (
          <p className="onb-alert">
            You'll need it. Sign up at{" "}
            <a href="https://workspace.google.com" target="_blank" rel="noreferrer">
              workspace.google.com
            </a>
            , set up your domain, then come back here.
          </p>
        )}

        <Notes value={w.note} onChange={(note) => setW({ note })} hint="Anything I should know?" />
      </div>

      <p className="onb-q">Where should every other invite go?</p>
      <Choice
        name="inviteTo"
        options={[
          { id: "team", label: `${(w.email ?? "").trim() || suggested} (recommended)` },
          { id: "jt", label: TYLER.email },
        ]}
        value={answers.inviteTo}
        onChange={(v) => update((a) => ({ ...a, inviteTo: v as Answers["inviteTo"] }))}
      />
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

      <p className="onb-q">What do you use for {section.noun}? Pick all that apply.</p>
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
          We don't use one
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
    <div className={`onb-tool is-${flag}`}>
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
            bad={["no"]}
          />
          {ans?.paid === "no" && <p className="onb-alert">{tool.paid.why}</p>}
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

      {needsSteps && (
        <div className="onb-how">
          <p className="onb-alert">I need {tool.role} here. Here's how to add me:</p>
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
          <p className="onb-note">Once it's done, come back and switch this to "Yes, admin."</p>
        </div>
      )}

      <Notes
        value={ans?.note}
        onChange={(note) => onChange({ note })}
        hint={tool.hint ?? "Anything I should know? (optional)"}
      />
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
  onSubmitted,
}: {
  record: OnboardingRecord;
  answers: Answers;
  items: Item[];
  onSubmitted: (at: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const todo = items.filter((i) => i.flag === "todo");
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
    <section className="blk onb-send" aria-labelledby="blk-send">
      {record.submittedAt && (
        <div className="form-done">
          <p className="form-done-t">Sent.</p>
          <p className="form-done-l">
            I've got your list and I'll check each one. If something's off, I'll text you. Made
            a change since? Send it again and I'll get the update.
          </p>
        </div>
      )}

      {todo.length > 0 ? (
        <p className="onb-note">
          Answer everything above before you send. {todo.length} left: {" "}
          {todo.map((t) => (t.tool === "Not picked yet" ? t.section : t.tool)).join(", ")}.
        </p>
      ) : null}

      {error && (
        <p className="form-err" role="alert">
          {error}. Your answers are saved. Try again, or text me.
        </p>
      )}

      <button
        className="btn btn-fill form-send"
        type="button"
        disabled={busy || todo.length > 0}
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
  hint,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <label className="field onb-notes">
      <span className="field-l mono">Notes</span>
      <textarea
        className="field-i field-t"
        rows={2}
        placeholder={hint}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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
