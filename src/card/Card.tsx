import { useEffect, useState } from "react";
import GridBackdrop from "../components/GridBackdrop";
import { ACCENTS, applyAccent } from "../accents";
import { BOOK_ENDPOINT, CALLS, CARD, SOCIALS, type Call, type Social } from "./data";
import "./card.css";

/**
 * jtylerray.com/card — the contact card, drawn in the site's own language:
 * the blueprint sheet, corner registration, mono labels, one accent.
 *
 * Built phone-first and read top to bottom: book a call, find me elsewhere,
 * or say what's broken. One layout at every width — the card is opened on a
 * phone nearly every time, so the phone gets the design and the desktop gets
 * the same card with more air around it.
 *
 * Nothing here hides behind a tap. The three-column version this replaced put
 * five contact channels side by side, which made the reader choose a channel
 * before they could say anything.
 */

/* the platform marks, monochrome, resolved by filename */
const marks = import.meta.glob<{ default: string }>("./marks/*.svg", { eager: true });
const markSrc = (name: string) =>
  Object.entries(marks).find(([p]) => p.endsWith(`/${name}.svg`))?.[1].default;

export default function Card() {
  useEffect(() => {
    // one index.html serves all three targets, so the card names itself
    document.title = `${CARD.name} — contact`;
    document.documentElement.setAttribute("data-style", "blueprint");
    const forest = ACCENTS.find((a) => a.id === "green") ?? ACCENTS[0];
    applyAccent(forest.hex, forest.gradient, forest.text);
  }, []);

  return (
    <div className="card-page" data-mark="color" data-eyebrow="wide">
      <GridBackdrop cell={48} crosshairs={4} drift={10} ticks={false} />
      <div className="corners" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <main className="card">
        <header className="card-head">
          <p className="mono card-eyebrow">Contact card</p>
          <h1 className="card-name">{CARD.name}</h1>
          <p className="mono card-role">{CARD.role}</p>
          <LocalTime />
        </header>

        {/* DOM order is the phone's: the message comes first, because writing
            one is the thing most people arrive here to do. The three columns
            on a wide screen are placed by grid-area, so the desktop reads
            calls · message · elsewhere without reordering the markup. */}
        <div className="card-body">
          <section className="blk blk-form" aria-labelledby="blk-form">
            <BlockHead title="How can I help?" sub="I answer every one" id="blk-form" />
            <BookForm />
          </section>

          <section className="blk blk-calls" aria-labelledby="blk-book">
            <BlockHead title="Book a call" sub="30 or 60 minutes" id="blk-book" />
            <div className="calls">
              {CALLS.map((c) => (
                <CallRow call={c} key={c.minutes} />
              ))}
            </div>
          </section>

          <section className="blk blk-social" aria-labelledby="blk-social">
            <BlockHead title="Elsewhere" sub="IG · LinkedIn · FB" id="blk-social" />
            <div className="socials">
              {SOCIALS.map((s) => (
                <SocialRow social={s} key={s.name} />
              ))}
            </div>
          </section>
        </div>

        <footer className="card-foot">
          <a className="card-site mono" href={CARD.site.href}>
            {CARD.site.label}
          </a>
          <span className="mono card-year">2026</span>
        </footer>
      </main>
    </div>
  );
}

/* No index numerals here. The blocks sit in one order on a phone and another
   on a desktop, so a printed 01/02/03 would have counted backwards at one of
   the two widths. The hairline and the mono sub-line carry the same language. */
function BlockHead({ title, sub, id }: { title: string; sub: string; id: string }) {
  return (
    <header className="blk-head">
      <h2 className="blk-title" id={id}>
        {title}
      </h2>
      <span className="blk-sub mono">{sub}</span>
    </header>
  );
}

/** The one live detail on the card: my local time, so a stranger in another
 *  timezone knows whether a message lands at nine in the morning or at three. */
function LocalTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CARD.zone,
  }).format(now);

  return (
    <p className="card-meta mono">
      {CARD.place} · {time} local
    </p>
  );
}

/** A booking link, drawn as its own length. The numeral is the row: at arm's
 *  length "30" and "60" are what the reader is choosing between. */
function CallRow({ call }: { call: Call }) {
  return (
    <a className="call" href={call.href} target="_blank" rel="noreferrer">
      <span className="call-n">{call.minutes}</span>
      <span className="call-body">
        <span className="call-title">{call.title}</span>
        <span className="call-note">{call.note}</span>
      </span>
      <span className="call-go mono" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

function SocialRow({ social }: { social: Social }) {
  const src = markSrc(social.mark);
  return (
    <a className="social" href={social.href} target="_blank" rel="noreferrer">
      {src && <img className="social-mark" src={src} alt="" />}
      <span className="social-name">{social.name}</span>
      <span className="social-handle mono">{social.handle}</span>
      <span className="social-go mono" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

type State = "idle" | "sending" | "sent" | "error";

/**
 * The form. Five fields, one of them a select, and the whole thing posts to
 * /api/book, which mails it on with the sender as the reply-to address.
 *
 * Validation is the browser's: required and type=email do the work, so a
 * mistyped address is caught before the request rather than after it. The
 * error state keeps every value — a failed send that clears the form is worse
 * than no form.
 */
function BookForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setState("sending");
    setError("");

    try {
      const res = await fetch(BOOK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
        <p className="form-done-t">Sent.</p>
        <p className="form-done-l">
          It lands in my inbox as it is. I reply from the address you gave, usually
          the same day.
        </p>
        <button className="btn btn-ghost" type="button" onClick={() => setState("idle")}>
          Send another
        </button>
      </div>
    );
  }

  const busy = state === "sending";

  return (
    <form className="form" onSubmit={onSubmit} noValidate={false}>
      <label className="field">
        <span className="field-l mono">Name</span>
        <input className="field-i" name="name" type="text" required autoComplete="name" />
      </label>

      <label className="field">
        <span className="field-l mono">Email</span>
        <input className="field-i" name="email" type="email" required autoComplete="email" />
      </label>

      <label className="field">
        <span className="field-l mono">Phone</span>
        <input
          className="field-i"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
      </label>

      {/* the honeypot: off-screen, unlabelled, never focusable. A bot fills
          it, the handler answers 200 and mails nothing. */}
      <input
        className="field-hp"
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <label className="field">
        <span className="field-l mono">What you need</span>
        <textarea
          className="field-i field-t"
          name="message"
          rows={4}
          required
          placeholder="The booking that never reaches the CRM, the report nobody believes, the launch the current setup will not survive."
        />
      </label>

      {state === "error" && (
        <p className="form-err" role="alert">
          {error} — or mail it to jt@jtylerray.com instead.
        </p>
      )}

      <button className="btn btn-fill form-send" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send it"}
      </button>
    </form>
  );
}
