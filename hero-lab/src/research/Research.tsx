import { useEffect, useMemo, useState } from "react";
import GridBackdrop from "../components/GridBackdrop";
import { ACCENTS, applyAccent } from "../accents";
import {
  COST,
  DONE,
  DURATION,
  INTENT,
  INTRO,
  PROBLEMS,
  RESEARCH_ENDPOINT,
  SPEND,
} from "./data";
import "../card/card.css";
import "../apply/apply.css";
import "./research.css";

/**
 * jtylerray.com/research — market research, sent to people rather than found.
 *
 * Drawn in the card's language like /apply is, so someone arriving from a DM
 * cannot tell they changed apps. card.css carries the fields and buttons,
 * apply.css the contrast lift.
 *
 * Questions 03 onward are about one problem, not the list. Asking all twelve
 * through cost and duration is what would blow the time budget, and an answer
 * averaged across five pains is not worth reading.
 *
 * Identity arrives in the link: ?ig=handle for a DM, ?r=id for a send from the
 * CRM. Without one the form asks, at the bottom rather than the top.
 */
export default function Research() {
  useEffect(() => {
    // one index.html serves every target, so each one names itself
    document.title = "Research — J. Tyler Ray";
    document.documentElement.setAttribute("data-style", "blueprint");
    const forest = ACCENTS.find((a) => a.id === "green") ?? ACCENTS[0];
    applyAccent(forest.hex, forest.gradient, forest.text);
  }, []);

  /* Validated here as well as in the handler: the handler protects the CRM,
     this stops a crafted link painting junk into the page. */
  const handle = useMemo(() => readParam("ig", HANDLE_OK, true), []);
  const ref = useMemo(() => readParam("r", REF_OK, false), []);

  return (
    <div className="card-page" data-mark="color" data-eyebrow="wide">
      <GridBackdrop cell={48} crosshairs={4} ticks={false} interactive={false} />
      <div className="corners" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <main className="card apply research">
        <header className="card-head">
          <p className="mono card-eyebrow">{INTRO.eyebrow}</p>
          <h1 className="card-name">{INTRO.title}</h1>
        </header>

        <ResearchForm handle={handle} ref_={ref} />

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

/** letters, numbers, dots and underscores, which is what Instagram allows */
const HANDLE_OK = /^[A-Za-z0-9._]{1,30}$/;
/** the CRM's own contact id, merged into an email or SMS send */
const REF_OK = /^[A-Za-z0-9]{15,40}$/;

function readParam(key: string, ok: RegExp, stripAt: boolean): string {
  const raw = (new URLSearchParams(location.search).get(key) ?? "").trim();
  const clean = stripAt ? raw.replace(/^@+/, "") : raw;
  return ok.test(clean) ? clean : "";
}

type State = "idle" | "sending" | "sent" | "error";

function ResearchForm({ handle, ref_ }: { handle: string; ref_: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  const [sell, setSell] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [duration, setDuration] = useState("");
  const [cost, setCost] = useState("");
  const [spend, setSpend] = useState<string[]>([]);
  const [happened, setHappened] = useState("");
  const [sources, setSources] = useState("");
  const [intent, setIntent] = useState("");
  const [ig, setIg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [trap, setTrap] = useState("");

  const top = picked[0]
    ? (PROBLEMS.find((p) => p.id === picked[0])?.label ?? "")
    : "";
  const tried = spend.some((s) => s !== "No, not yet");
  const wantsContact = Boolean(intent);
  const needsHandle = !handle && !ref_;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    /* Asking me to follow up and leaving nowhere to follow up to. The browser
       cannot catch this: required on both fields would demand both, required
       on neither accepts the empty case. A handle is a way to know who
       answered, not a way to reach them, so a link does not excuse it. */
    if (wantsContact && !email.trim() && !phone.trim()) {
      setState("error");
      setError("Add an email or a phone number so I have somewhere to reply.");
      return;
    }

    setState("sending");
    setError("");

    try {
      const res = await fetch(RESEARCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sell,
          problems: picked,
          problemsOther: other,
          duration,
          cost,
          spend,
          happened,
          sources,
          intent,
          instagram: handle || ig,
          ref: ref_,
          name,
          email,
          phone,
          company: trap,
          source: new URLSearchParams(location.search).get("utm_source") || "",
          submittedAt: new Date().toISOString(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        throw new Error(body.error || `Send failed (${res.status})`);
      }
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (state === "sent") {
    return (
      <div className="form-done">
        <p className="form-done-t">{DONE.title}</p>
        <p className="form-done-l">{wantsContact ? DONE.lineContact : DONE.line}</p>
      </div>
    );
  }

  /**
   * The questions are built as a list and numbered from their position in it,
   * not labelled by hand. Half of them only exist once a problem is picked, so
   * hand-written numerals ran 03 then 09 on a form nobody had answered yet.
   */
  const questions: { key: string; label: string; note?: string; body: React.ReactNode }[] = [
    {
      key: "sell",
      label: "What does your business sell?",
      body: (
        <input
          className="field-i"
          value={sell}
          onChange={(e) => setSell(e.target.value)}
          placeholder="One line is plenty"
        />
      ),
    },
    {
      key: "problems",
      label: "Which of these are real for you?",
      note: "First tap is the most important.",
      body: (
        <Picker picked={picked} setPicked={setPicked} other={other} setOther={setOther} />
      ),
    },
  ];

  if (top) {
    questions.push(
      {
        key: "duration",
        label: `How long has "${top}" been going on?`,
        body: <Options options={[...DURATION]} value={duration} onPick={setDuration} />,
      },
      {
        key: "cost",
        label: "How much has it cost you?",
        body: <Options options={[...COST]} value={cost} onPick={setCost} />,
      },
      {
        key: "spend",
        label: "Have you spent money trying to fix it?",
        body: <Options options={[...SPEND]} value={spend} onPick={setSpend} multi />,
      }
    );

    if (tried) {
      questions.push({
        key: "happened",
        label: "What happened?",
        note: "Optional.",
        body: (
          <textarea
            className="field-i field-t"
            rows={4}
            value={happened}
            onChange={(e) => setHappened(e.target.value)}
            placeholder="Why it did not stick, or did not finish, or did not get used."
          />
        ),
      });
    }
  }

  questions.push(
    {
      key: "sources",
      label: "Where do you go when you need to figure this stuff out?",
      note: "Optional.",
      body: (
        <input
          className="field-i"
          value={sources}
          onChange={(e) => setSources(e.target.value)}
          placeholder="People, podcasts, communities, whoever you ask"
        />
      ),
    },
    {
      key: "intent",
      label:
        "Are you actively looking for help with this, or open to a call about how we might solve it?",
      body: (
        <div className="r-doors">
          {INTENT.map((d) => (
            <button
              type="button"
              key={d.id}
              className="r-door"
              aria-pressed={intent === d.id}
              onClick={() => setIntent(intent === d.id ? "" : d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      ),
    }
  );

  const busy = state === "sending";

  return (
    <form className="form research-form" onSubmit={onSubmit}>
      {questions.map((q, i) => (
        <Q key={q.key} n={String(i + 1).padStart(2, "0")} label={q.label} note={q.note}>
          {q.body}
        </Q>
      ))}

      {/* the honeypot: off-screen, unlabelled, never focusable */}
      <input
        className="field-hp"
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
      />

      {(needsHandle || wantsContact) && (
        <div className="r-who">
          {needsHandle && (
            <label className="field">
              <span className="field-l mono">Your Instagram</span>
              <input
                className="field-i"
                value={ig}
                onChange={(e) => setIg(e.target.value)}
                required
                placeholder="@yourhandle"
                autoComplete="off"
              />
            </label>
          )}

          {wantsContact && (
            <>
              <label className="field">
                <span className="field-l mono">First name</span>
                <input
                  className="field-i"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </label>

              <div className="field-pair">
                <label className="field">
                  <span className="field-l mono">Email</span>
                  <input
                    className="field-i"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>

                <label className="field">
                  <span className="field-l mono">Phone</span>
                  <input
                    className="field-i"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </label>
              </div>
            </>
          )}
        </div>
      )}

      {state === "error" && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}

      <button className="btn btn-fill form-send" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send it"}
      </button>
    </form>
  );
}

/* ── the parts ─────────────────────────────────────────────────────── */

function Q({
  n,
  label,
  note,
  children,
}: {
  n: string;
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="r-q">
      <h2 className="r-q-head">
        <span className="mono r-q-n" aria-hidden="true">
          {n}
        </span>
        {label}
      </h2>
      {note && <p className="mono r-q-note">{note}</p>}
      <div className="r-q-body">{children}</div>
    </section>
  );
}

/** Tappable options, laid out as an even grid rather than a ragged wrap: four
 *  options of uneven length flex-wrapped leave one stranded on its own row,
 *  which reads as a different kind of answer than the three above it. */
function Options(props: {
  options: string[];
  value: string | string[];
  onPick: ((v: string) => void) | ((v: string[]) => void);
  multi?: boolean;
}) {
  const { options, value, multi } = props;
  const on = (o: string) => (multi ? (value as string[]).includes(o) : value === o);

  function pick(o: string) {
    if (multi) {
      const cur = value as string[];
      const next = cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o];
      (props.onPick as (v: string[]) => void)(next);
    } else {
      (props.onPick as (v: string) => void)(value === o ? "" : o);
    }
  }

  return (
    <div className="r-opts">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          className="r-opt"
          aria-pressed={on(o)}
          onClick={() => pick(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/**
 * Tap to select, and tap order is the ranking.
 *
 * The ranked list reorders three ways, because no one way covers both inputs:
 * drag with a mouse, arrows with a thumb. HTML5 drag events do not fire on a
 * touchscreen at all, so the arrows are not a fallback for the drag — they are
 * the only thing half the readers will have.
 */
function Picker({
  picked,
  setPicked,
  other,
  setOther,
}: {
  picked: string[];
  setPicked: (v: string[]) => void;
  other: string;
  setOther: (v: string) => void;
}) {
  const [from, setFrom] = useState<number | null>(null);

  function toggle(id: string) {
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  }

  function move(a: number, b: number) {
    if (a === b || b < 0 || b >= picked.length) return;
    const next = [...picked];
    const [row] = next.splice(a, 1);
    next.splice(b, 0, row);
    setPicked(next);
  }

  return (
    <>
      <div className="r-grid">
        {PROBLEMS.map((p) => (
          <button
            type="button"
            key={p.id}
            className="r-prob"
            aria-pressed={picked.includes(p.id)}
            onClick={() => toggle(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="field r-other">
        <span className="field-l mono">Something else · optional</span>
        <input
          className="field-i"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="In your words"
        />
      </label>

      {picked.length > 0 && (
        <ol className="r-rank-list">
          {picked.map((id, i) => (
            <li
              className="r-rank-row"
              key={id}
              draggable
              aria-grabbed={from === i}
              onDragStart={() => setFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => {
                if (from !== null && from !== i) {
                  move(from, i);
                  setFrom(i);
                }
              }}
              onDragEnd={() => setFrom(null)}
              onDrop={(e) => {
                e.preventDefault();
                setFrom(null);
              }}
            >
              <span className="mono r-rank-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="r-rank-l">{PROBLEMS.find((p) => p.id === id)?.label}</span>
              <span className="r-rank-acts">
                <button
                  type="button"
                  className="r-nudge"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="r-nudge"
                  onClick={() => move(i, i + 1)}
                  disabled={i === picked.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="r-nudge r-drop"
                  onClick={() => toggle(id)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
