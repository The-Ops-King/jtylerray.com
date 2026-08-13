import { useEffect, useMemo, useState } from "react";
import GridBackdrop from "../components/GridBackdrop";
import { ACCENTS, applyAccent } from "../accents";
import { CARD, GROUPS, type Row } from "./data";
import "./card.css";

/**
 * jtylerray.com/card — the contact card, drawn in the site's own language:
 * the blueprint sheet, corner registration, mono labels, one accent.
 *
 * Content is the old card at card.jtylerray.com without the payment group.
 * Every row is a real link, so a phone opens mail, messages or WhatsApp
 * directly rather than routing through a script.
 *
 * Three columns, everything open. The card is handed over and read at arm's
 * length: nothing should need a tap to reveal itself, and nothing animates —
 * the collapsing panels this replaced were repainting the whole card.
 */

/* the platform marks, monochrome, resolved by filename */
const marks = import.meta.glob<{ default: string }>("./marks/*.svg", { eager: true });
const markSrc = (name?: string) =>
  name
    ? Object.entries(marks).find(([p]) => p.endsWith(`/${name}.svg`))?.[1].default
    : undefined;

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
          <div className="card-head-main">
            <p className="mono card-eyebrow">Contact card</p>
            <h1 className="card-name">{CARD.name}</h1>
            <p className="mono card-role">{CARD.role}</p>
          </div>
          <LocalTime />
        </header>

        <div className="card-cols">
          {GROUPS.map((g) => (
            <section className="grp" key={g.title}>
              <header className="grp-head">
                <span className="grp-n mono">{g.n}</span>
                <h2 className="grp-title">{g.title}</h2>
                <span className="grp-sub mono">{g.sub}</span>
              </header>
              <div className="grp-rows">
                {g.rows.map((r) => (
                  <CardRow row={r} key={r.value + r.href} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="card-foot">
          <div className="card-actions">
            <a className="btn btn-fill" href={`mailto:${CARD.vcard.email}`}>
              Get in touch
            </a>
            <SaveContact />
          </div>
          <a
            className="card-site mono"
            href={CARD.site.href}
            target="_blank"
            rel="noreferrer"
          >
            {CARD.site.label}
          </a>
        </footer>
      </main>
    </div>
  );
}

/** The one live detail on the card: my local time, so a stranger in another
 *  timezone knows whether a text lands at nine in the morning or at three. */
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
    <div className="card-meta mono">
      <span>{CARD.place}</span>
      <span>{time} local</span>
    </div>
  );
}

/** A .vcf built in the browser, so the card can be saved to a phone rather
 *  than retyped off it. No library, no network. */
function SaveContact() {
  const href = useMemo(() => {
    const v = CARD.vcard;
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${v.last};${v.first};;;`,
      `FN:${v.org}`,
      `TITLE:${v.title}`,
      `EMAIL;TYPE=INTERNET:${v.email}`,
      `TEL;TYPE=CELL:${v.phone}`,
      `URL:${CARD.site.href}`,
      "END:VCARD",
    ];
    return `data:text/vcard;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
  }, []);

  return (
    <a className="btn btn-ghost" href={href} download="j-tyler-ray.vcf">
      Save contact
    </a>
  );
}

function CardRow({ row }: { row: Row }) {
  const src = markSrc(row.mark);
  return (
    <a
      className="crow"
      href={row.href}
      {...(row.external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <span className="crow-cursor" aria-hidden="true" />
      {row.label && <span className="crow-label mono">{row.label}</span>}
      <span className="crow-value">
        {src && <img className="crow-mark" src={src} alt="" />}
        {row.value}
      </span>
      {row.note && <span className="crow-note">{row.note}</span>}
      <span className="crow-go mono" aria-hidden="true">
        {row.external ? "↗" : "→"}
      </span>
    </a>
  );
}
