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
  STUCK,
  TEAM_SIZE,
  WANTS_CONTACT,
} from "./data";
import "../card/card.css";
import "../apply/apply.css";
import "./research.css";

/**
 * jtylerray.com/research — market research, sent to people rather than found.
 *
 * Drawn in the card's language like /apply is, for the same reason: someone
 * arriving from a DM should not be able to tell they changed apps. card.css
 * carries the fields and buttons, apply.css the lede and the contrast lift.
 *
 * Two things shape the whole page:
 *
 * It is one scroll, not a wizard. The target is two minutes, and step
 * transitions cost more time than they save on a form this short.
 *
 * Questions 4 to 8 are about one problem, not the list. Asking all twelve
 * through the cost and duration questions is what would blow the budget, and
 * averaging an answer across five pains produces nothing worth reading.
 *
 * Identity arrives in the link: ?ig=handle, substituted per recipient. When it
 * is missing the form asks, and it asks at the bottom rather than the top,
 * where ninety seconds of answers are already behind them.
 */
export default function Research() {
  useEffect(() => {
    // one index.html serves every target, so each one names itself
    document.title = "Research — J. Tyler Ray";
    document.documentElement.setAttribute("data-style", "blueprint");
    const forest = ACCENTS.find((a) => a.id === "green") ?? ACCENTS[0];
    applyAccent(forest.hex, forest.gradient, forest.text);
  }, []);

  /* The handle off the query string, read once. Validated here as well as in
     the handler: the handler is what protects the CRM, this is what stops a
     crafted link painting junk into the page it is echoed on. */
  const handle = useMemo(() => readHandle(), []);
  const ref = useMemo(() => readRef(), []);

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
          <p className="apply-lede">{INTRO.lede}</p>
        </header>

        <ul className="apply-notes">
          {INTRO.notes.map((n) => (
            <li className="apply-note" key={n}>
              <span className="apply-note-tick mono" aria-hidden="true">
                —
              </span>
              {n}
            </li>
          ))}
          {(handle || ref) && (
            <li className="apply-note">
              <span className="apply-note-tick mono" aria-hidden="true">
                —
              </span>
              {handle ? INTRO.tokenNote : INTRO.refNote}
            </li>
          )}
        </ul>

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

/** letters, numbers, dots and underscores, which is what Instagram allows.
 *  Anything else means the parameter was not written by me. */
const HANDLE_OK = /^[A-Za-z0-9._]{1,30}$/;

function readHandle(): string {
  const raw = new URLSearchParams(location.search).get("ig") ?? "";
  const clean = raw.trim().replace(/^@+/, "");
  return HANDLE_OK.test(clean) ? clean : "";
}

/** ?r= is the CRM's own contact id, merged into an email or SMS send the way
 *  ?ig= is merged into a DM. Someone reached by email may not have an
 *  Instagram at all, so asking them for one would be asking for something they
 *  cannot give. */
const REF_OK = /^[A-Za-z0-9]{15,40}$/;

function readRef(): string {
  const raw = (new URLSearchParams(location.search).get("r") ?? "").trim();
  return REF_OK.test(raw) ? raw : "";
}

type State = "idle" | "sending" | "sent" | "error";

function ResearchForm({ handle, ref_ }: { handle: string; ref_: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  const [sell, setSell] = useState("");
  const [team, setTeam] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [duration, setDuration] = useState("");
  const [cost, setCost] = useState<string[]>([]);
  const [spend, setSpend] = useState<string[]>([]);
  const [happened, setHappened] = useState("");
  const [stuck, setStuck] = useState<string[]>([]);
  const [sources, setSources] = useState("");
  const [intent, setIntent] = useState("");
  const [ig, setIg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [trap, setTrap] = useState("");

  /* The top problem names itself in the questions that follow it, so the
     reader is answering about a specific thing rather than about operations in
     general. Nothing below question 3 renders until there is one. */
  const top = picked[0]
    ? (PROBLEMS.find((p) => p.id === picked[0])?.label ?? "")
    : "";
  const tried = spend.some((s) => s !== "No, not yet");
  const wantsContact = WANTS_CONTACT.includes(intent);
  const needsHandle = !handle && !ref_;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    /* Asking me to follow up and leaving nowhere to follow up to. The browser
       cannot catch this one: required on both fields would demand both, and
       required on neither accepts an answer with no reply address on it. A
       handle is not a way to reach someone either, so arriving through a link
       does not excuse it. */
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
          team,
          problems: picked,
          problemsOther: other,
          duration,
          cost,
          spend,
          happened,
          stuck,
          sources,
          intent,
          instagram: handle || ig,
          ref: ref_,
          handleFromLink: Boolean(handle),
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
        <p className="form-done-l">
          {wantsContact ? DONE.lineContact : DONE.line}
        </p>
      </div>
    );
  }

  const busy = state === "sending";

  return (
    <form className="form research-form" onSubmit={onSubmit}>
      <Q n="01" label="What does your business sell?">
        <input
          className="field-i"
          value={sell}
          onChange={(e) => setSell(e.target.value)}
          placeholder="One line is plenty"
        />
      </Q>

      <Q n="02" label="How many people touch a lead between it arriving and money collected?">
        <Chips options={[...TEAM_SIZE]} value={team} onPick={setTeam} />
      </Q>

      <Q
        n="03"
        label="Tap the ones that are real. First tap is the biggest."
        note="These are the things I have actually been hired to fix."
      >
        <Picker picked={picked} setPicked={setPicked} other={other} setOther={setOther} />
      </Q>

      {top && (
        <>
          <Q n="04" label={`How long has "${top}" been going on?`}>
            <Chips options={[...DURATION]} value={duration} onPick={setDuration} />
          </Q>

          <Q n="05" label="What does it cost you?" note="Tap all that apply.">
            <Chips options={[...COST]} value={cost} onPick={setCost} multi />
          </Q>

          <Q n="06" label="Have you spent money trying to fix it?" note="Tap all that apply.">
            <Chips options={[...SPEND]} value={spend} onPick={setSpend} multi />
          </Q>

          {tried && (
            <Q n="07" label="What happened?" note="Optional, and the most useful box on the page.">
              <textarea
                className="field-i field-t"
                rows={4}
                value={happened}
                onChange={(e) => setHappened(e.target.value)}
                placeholder="Why it did not stick, or did not finish, or did not get used."
              />
            </Q>
          )}

          <Q
            n="08"
            label="If you were fixing it yourself, where would you get stuck?"
            note="Tap all that apply."
          >
            <Chips options={[...STUCK]} value={stuck} onPick={setStuck} multi />
          </Q>
        </>
      )}

      <Q n="09" label="Where do you go when you need to figure this stuff out?" note="Optional.">
        <input
          className="field-i"
          value={sources}
          onChange={(e) => setSources(e.target.value)}
          placeholder="People, podcasts, communities, whoever you ask"
        />
      </Q>

      <Q n="10" label="Last one. Where are you on this?">
        <div className="r-doors">
          {INTENT.map((d) => (
            <button
              type="button"
              key={d.id}
              className="r-door"
              aria-pressed={intent === d.id}
              onClick={() => setIntent(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Q>

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
              <span className="field-note mono">
                So I know whose answers these are. That is all it is for.
              </span>
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
              <p className="field-note mono r-note">
                Either one is enough. I only need somewhere to reply.
              </p>
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

/** One question: a mono index, the question itself, an optional note. */
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

/** Tappable options. Single-pick writes a string, multi writes an array, so
 *  the same control serves questions 02 and 05 without a second component. */
function Chips(props: {
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
      (props.onPick as (v: string) => void)(o);
    }
  }

  return (
    <div className="r-chips">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          className="r-chip"
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
 * Question 03: tap to select, and tap order is the ranking.
 *
 * One interaction doing the work of three questions — which problems, in what
 * order, and which is worst — because ordering costs nothing once the taps are
 * already a sequence.
 *
 * The ranked list reorders with arrows, not drag. Drag-to-reorder on a
 * touchscreen is the most reliably broken interaction on the mobile web, and
 * half of these will be filled in on a phone.
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
  function toggle(id: string) {
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  }

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= picked.length) return;
    const next = [...picked];
    [next[i], next[j]] = [next[j], next[i]];
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
        <div className="r-rank">
          <p className="mono r-rank-head">
            Worst first. Nudge anything that is out of order.
          </p>
          <ol className="r-rank-list">
            {picked.map((id, i) => (
              <li className="r-rank-row" key={id}>
                <span className="mono r-rank-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="r-rank-l">
                  {PROBLEMS.find((p) => p.id === id)?.label}
                </span>
                <span className="r-rank-acts">
                  <button
                    type="button"
                    className="r-nudge"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="r-nudge"
                    onClick={() => move(i, 1)}
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
        </div>
      )}
    </>
  );
}
