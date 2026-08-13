import GridBackdrop from "../components/GridBackdrop";
import { EMAIL } from "../components/Nav";
import { Headline, useCopy } from "../components/CopyContext";
import { STYLES, type StyleDef } from "../styles";
import "./variants.css";

const INDEX = [
  { n: "01 — build", t: "CRM architecture, automations, reporting, call intelligence" },
  { n: "02 — for", t: "Founders running high-ticket coaching and education businesses" },
  { n: "03 — ceiling", t: "When the no-code tools run out of road, I write code" },
];

export default function V5Index({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  return (
    <section className="hero v5">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <div className="v5-frame">
          <span className="mono">J. TYLER RAY</span>
          <span className="mono v5-mid">SALES OPERATIONS</span>
          <span className="mono">
            <a href="#work">WORK</a> · <a href="#stack">STACK</a> ·{" "}
            <a href={`mailto:${EMAIL}`}>CONTACT</a>
          </span>
        </div>

        <div className="v5-mid-body">
          <p className="eyebrow rise rise-1">{copy.eyebrow}</p>
          <h1 className="display rise rise-2">
            <Headline />
          </h1>
          <p className="lede rise rise-3">{copy.lede}</p>
          <div className="btns rise rise-4">
            <a className="btn btn-accent" href={`mailto:${EMAIL}`}>
              Get in touch
            </a>
            <a className="btn btn-ghost" href="#work">
              See the work
            </a>
          </div>
        </div>

        <div className="v5-index rise rise-4">
          {INDEX.map((i) => (
            <div key={i.n}>
              <div className="v5-n mono">{i.n}</div>
              <div className="v5-t">{i.t}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
