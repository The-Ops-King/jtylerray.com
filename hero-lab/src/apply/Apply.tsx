import { useEffect, useRef, useState } from "react";
import GridBackdrop from "../components/GridBackdrop";
import { ACCENTS, applyAccent } from "../accents";
import {
  APPLY,
  APPLY_ENDPOINT,
  CALL_ASK_DAYS,
  CALL_IDEAL_DAYS,
  CALL_PROMPT,
  CLOSED,
  DECLINED,
  ON_OFFER,
  OPEN,
  ROLE,
  SENT,
  YEARS,
} from "./data";
import "../card/card.css";
import "./apply.css";

/**
 * jtylerray.com/apply — the lead nurture specialist application.
 *
 * Drawn in the card's language on purpose: same blueprint sheet, same corner
 * registration, same mono labels, same single green accent. A candidate who
 * arrives here from the card or the page should not be able to tell they
 * changed apps.
 *
 * card.css is imported rather than copied. Everything here is a `.card-page`,
 * so the fields, the buttons and the block heads are the card's — apply.css
 * adds the lede and the terms, and lifts the contrast: a form is filled in,
 * not glanced at, and the card's label grey is too quiet to type against.
 *
 * Submissions post to /api/apply, which appends a row to the hiring Google
 * Sheet and mails a copy.
 */
export default function Apply() {
  useEffect(() => {
    // one index.html serves every target, so each one names itself
    document.title = "Apply — B2B Closer · J. Tyler Ray";
    document.documentElement.setAttribute("data-style", "blueprint");
    const forest = ACCENTS.find((a) => a.id === "green") ?? ACCENTS[0];
    applyAccent(forest.hex, forest.gradient, forest.text);
  }, []);

  return (
    <div className="card-page" data-mark="color" data-eyebrow="wide">
      <GridBackdrop cell={48} crosshairs={4} ticks={false} interactive={false} />
      <div className="corners" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <main className={OPEN ? "card apply" : "card apply apply-closed"}>
        <header className="card-head">
          {OPEN && <p className="mono card-eyebrow">{APPLY.eyebrow}</p>}
          <h1 className="card-name">{OPEN ? APPLY.title : CLOSED.title}</h1>
          {!OPEN && <p className="apply-lede">{CLOSED.line}</p>}
        </header>

        {APPLY.notes.length > 0 && (
          <ul className="apply-notes">
            {APPLY.notes.map((n) => (
              <li className="apply-note" key={n}>
                <span className="apply-note-tick mono" aria-hidden="true">
                  —
                </span>
                {n}
              </li>
            ))}
          </ul>
        )}

        {OPEN && (
          <section className="blk" aria-labelledby="blk-apply">
            <header className="blk-head">
              <h2 className="blk-title" id="blk-apply">
                Your application
              </h2>
              <span className="blk-sub mono">Read by me</span>
            </header>
            <ApplyForm />
          </section>
        )}

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

type State = "idle" | "sending" | "sent" | "declined" | "error";

/** today where the applicant is, so the date picker cannot offer tomorrow */
function today(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Whole days old, both ends pinned to noon UTC. The same arithmetic the
 *  handler uses, so the page never warns about a date the server accepts or
 *  stays quiet about one it rejects. */
function daysOld(value: string): number {
  const when = Date.parse(value + "T12:00:00Z");
  if (Number.isNaN(when)) return 0;
  const now = Date.parse(new Date().toISOString().slice(0, 10) + "T12:00:00Z");
  return Math.round((now - when) / 86400000);
}

/**
 * The form.
 *
 * The criteria are checked by the function, not here. A browser check is a
 * courtesy to whoever is filling the form in, not a gate: the page is a static
 * bundle anyone can edit before it posts, so the only check that counts is the
 * one on the server.
 *
 * Nothing on this page says which answer ends an application either. A form
 * that marks the disqualifying option is a puzzle with the answers printed on
 * the back of it.
 *
 * A failed send keeps every value. A declined one does not: it is finished.
 */
function ApplyForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const callDate = useRef<HTMLInputElement>(null);
  /* the one date they have already been asked about and stood by, so picking
     it again, or tabbing back through the field, does not ask twice */
  const settled = useRef("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    setState("sending");
    setError("");

    try {
      const res = await fetch(APPLY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: ROLE, submittedAt: new Date().toISOString() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        throw new Error(body.error || `Send failed (${res.status})`);
      }
      setState(body.qualified === false ? "declined" : "sent");
      form.reset();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (state === "sent" || state === "declined") {
    const said = state === "sent" ? SENT : DECLINED;
    return (
      <div className="form-done">
        <p className="form-done-t">{said.title}</p>
        <p className="form-done-l">{said.line}</p>
      </div>
    );
  }

  const busy = state === "sending";

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field-pair">
        <label className="field">
          <span className="field-l mono">First name</span>
          <input
            className="field-i"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
          />
        </label>

        <label className="field">
          <span className="field-l mono">Last name</span>
          <input
            className="field-i"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
          />
        </label>
      </div>

      <div className="field-pair">
        <label className="field">
          <span className="field-l mono">Email</span>
          <input
            className="field-i"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </label>

        <label className="field">
          <span className="field-l mono">Phone</span>
          <input
            className="field-i"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
          />
        </label>
      </div>

      {/* ── what the role requires ──────────────────────────────────── */}

      <div className="field-pair">
        <label className="field">
          <span className="field-l mono">Years closing high ticket</span>
          <select className="field-i field-s" name="years" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-l mono">Are you on an offer now?</span>
          <select className="field-i field-s" name="onOffer" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {ON_OFFER.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Not required, deliberately. Required would mean the browser blocks
          the send and nobody without it ever reaches an answer. They send it,
          and the function decides. */}
      <label className="field-check">
        <input className="check-i" name="b2b" type="checkbox" value="yes" />
        <span className="check-l">I have closed B2B offers.</span>
      </label>

      <div className="field-pair">
        <label className="field">
          <span className="field-l mono">Sales call recording</span>
          <input
            className="field-i"
            name="callRecording"
            type="url"
            required
            inputMode="url"
            placeholder="https://..."
          />
        </label>

        <label className="field">
          <span className="field-l mono">Date of that call</span>
          <input
            ref={callDate}
            className="field-i"
            name="callDate"
            type="date"
            required
            max={today()}
            onChange={(e) => {
              const v = e.target.value;
              if (!v || v === settled.current) return;
              if (daysOld(v) > CALL_ASK_DAYS) dialog.current?.showModal();
            }}
          />
        </label>
      </div>
      <span className="field-note mono">
        A recorded call of you closing. Within the last {CALL_IDEAL_DAYS} days is what
        we are looking for. Make sure the link is one we can open.
      </span>

      {/* ── the rest ────────────────────────────────────────────────── */}

      <label className="field">
        <span className="field-l mono">Facebook profile</span>
        <input
          className="field-i"
          name="facebook"
          type="url"
          required
          inputMode="url"
          placeholder="https://facebook.com/yourprofile"
        />
      </label>

      <label className="field">
        <span className="field-l mono">Intro video · optional, highly recommended</span>
        <input
          className="field-i"
          name="videoUrl"
          type="url"
          inputMode="url"
          placeholder="https://loom.com/share/…"
        />
      </label>

      {/* the honeypot: off-screen, unlabelled, never focusable */}
      <input
        className="field-hp"
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <label className="field">
        <span className="field-l mono">What qualifies you?</span>
        <textarea
          className="field-i field-t exp-t"
          name="experience"
          rows={8}
          required
        />
      </label>

      {state === "error" && (
        <p className="form-err" role="alert">
          {error} — or mail it to jt@jtylerray.com instead.
        </p>
      )}

      <button className="btn btn-fill form-send" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Submit application"}
      </button>

      {/* A native dialog: it traps focus, closes on Escape and dims the page
          behind it without any of that being written here. It asks, it does
          not block — the handler is what decides, and somebody whose most
          recent call really is old should still be able to finish. */}
      <dialog className="ask" ref={dialog}>
        <h2 className="ask-t">{CALL_PROMPT.title}</h2>
        <p className="ask-l">{CALL_PROMPT.line}</p>
        <div className="ask-btns">
          <button
            type="button"
            className="btn btn-fill"
            onClick={() => {
              dialog.current?.close();
              /* cleared, not left sitting there: the point is a different
                 date, and an old one still in the field invites submitting it
                 by accident */
              if (callDate.current) callDate.current.value = "";
              callDate.current?.focus();
            }}
          >
            {CALL_PROMPT.change}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              settled.current = callDate.current?.value ?? "";
              dialog.current?.close();
            }}
          >
            {CALL_PROMPT.keep}
          </button>
        </div>
      </dialog>
    </form>
  );
}
