import GridBackdrop from "../components/GridBackdrop";
import Nav, { EMAIL } from "../components/Nav";
import { STYLES, type StyleDef } from "../styles";
import { Headline, useCopy } from "../components/CopyContext";
import "./variants.css";

const STRIP = ["CRM architecture", "Automations", "Reporting", "Call intelligence", "Custom software"];

export default function V2Stage({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  return (
    <section className="hero v2">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <Nav pill />
        <div className="v2-body">
          <p className="eyebrow plain rise rise-1"><span className="dot pulse" />{" "}{copy.eyebrow}</p>
          <h1 className="display v2-h1 rise rise-2">
            <Headline />
          </h1>
          <p className="lede v2-lede rise rise-3">{copy.lede}</p>
          <div className="btns v2-btns rise rise-4">
            <a className="btn btn-accent pill" href={`mailto:${EMAIL}`}>
              Get in touch
            </a>
            <a className="btn btn-ghost pill" href="#work">
              See the work
            </a>
          </div>
        </div>
        <div className="v2-strip rise rise-4">
          {STRIP.map((s) => (
            <span className="v2-chip mono" key={s}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
