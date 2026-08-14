import GridBackdrop from "../components/GridBackdrop";
import Nav, { EMAIL } from "../components/Nav";
import { STYLES, type StyleDef } from "../styles";
import { Headline, useCopy } from "../components/CopyContext";
import "./variants.css";

const CAPS = ["CRM architecture", "Automations", "Reporting", "Call intelligence", "Custom software"];

/** Mark stage — the monogram opens the page, headline centred beneath it,
 *  capabilities stamped along the bottom rule. */
export default function L3Mark({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  return (
    <section className="hero l3">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <Nav wordmark={false} />
        <div className="l3-body">
          {/* the mark is masked, not an <img>, so it takes the accent or bone */}
          <div className="l3-mark rise rise-1" role="img" aria-label="J. Tyler Ray monogram" />
          <p className="eyebrow plain rise rise-1">{copy.eyebrow}</p>
          <h1 className="display l3-h1 rise rise-2">
            <Headline />
          </h1>
          <p className="lede l3-lede rise rise-3">{copy.lede}</p>
          <div className="btns l3-btns rise rise-4">
            <a className="btn btn-accent" href={`mailto:${EMAIL}`}>
              Get in touch
            </a>
            <a className="btn btn-ghost" href="#work">
              See the work
            </a>
          </div>
        </div>
        <div className="l3-caps rise rise-4">
          {CAPS.map((c) => (
            <span className="mono" key={c}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
