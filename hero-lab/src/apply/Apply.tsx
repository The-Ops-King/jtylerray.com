import { useEffect, useState } from "react";
import GridBackdrop from "../components/GridBackdrop";
import { ACCENTS, applyAccent } from "../accents";
import { APPLY, APPLY_ENDPOINT } from "./data";
import "../card/card.css";
import "./apply.css";

/**
 * jtylerray.com/apply — the closer application.
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
    document.title = "Apply — Closer · J. Tyler Ray";
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

      <main className="card apply">
        <header className="card-head">
          <p className="mono card-eyebrow">{APPLY.eyebrow}</p>
          <h1 className="card-name">{APPLY.title}</h1>
          <p className="apply-lede">{APPLY.lede}</p>
        </header>

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

        <section className="blk" aria-labelledby="blk-apply">
          <header className="blk-head">
            <h2 className="blk-title" id="blk-apply">
              Your application
            </h2>
            <span className="blk-sub mono">Five minutes · read by me</span>
          </header>
          <ApplyForm />
        </section>

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

type State = "idle" | "sending" | "sent" | "error";

/**
 * The form. Seven fields, all of them plain — the experience is one box the
 * applicant writes into, not a structured list. A closer describing three
 * years of high-ticket work in their own order says more than the same person
 * filling in a company and a date range three times.
 *
 * A failed send keeps every value.
 */
function ApplyForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

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
        body: JSON.stringify({ ...data, submittedAt: new Date().toISOString() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        throw new Error(body.error || `Send failed (${res.status})`);
      }
      setState("sent");
      form.reset();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (state === "sent") {
    return (
      <div className="form-done">
        <p className="form-done-t">In.</p>
        <p className="form-done-l">
          Your application is on my desk. Every one gets read and every one gets an
          answer — if it is a fit you will hear from me directly.
        </p>
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
        <span className="field-note mono">
          You are applying to sell on camera. Two minutes of you doing it beats two
          paragraphs — Loom, Drive, YouTube, any link.
        </span>
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
        <span className="field-l mono">High-ticket experience</span>
        <textarea
          className="field-i field-t exp-t"
          name="experience"
          rows={8}
          required
          placeholder="Where you have closed in the high-ticket space: the offers, the price points, the close rates, your best month, and how long you were there. Write it however you would say it."
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
    </form>
  );
}
