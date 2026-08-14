import GridBackdrop from "../components/GridBackdrop";
import Nav, { EMAIL } from "../components/Nav";
import { STYLES, type StyleDef } from "../styles";
import { Headline, useCopy } from "../components/CopyContext";
import "./variants.css";

const ROWS = [
  { t: "Every call logged, not just the memorable ones", tag: "CRM" },
  { t: "Speed to lead cut from four hours to ninety seconds", tag: "90s" },
  { t: "Call transcripts written straight into fields", tag: "API" },
  { t: "Scorecards and manager reporting on live data", tag: "SQL" },
  { t: "Custom services where no tool exists", tag: "CODE" },
];

export default function V3Panel({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  return (
    <section className="hero v3">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <Nav />
        <div className="v3-body">
          <div className="v3-left">
            <p className="eyebrow rise rise-1">{copy.eyebrow}</p>
            <h1 className="display md rise rise-2">
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

          <div className="v3-panel rise rise-4">
            <div className="v3-panel-hd">
              <span className="mono">what gets built</span>
              <span className="mono v3-live">
                <span className="dot pulse" /> live
              </span>
            </div>
            <ul>
              {ROWS.map((r) => (
                <li key={r.tag}>
                  <span>{r.t}</span>
                  <span className="mono accent">{r.tag}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
