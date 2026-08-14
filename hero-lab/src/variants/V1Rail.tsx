import GridBackdrop from "../components/GridBackdrop";
import Nav, { EMAIL } from "../components/Nav";
import { STYLES, type StyleDef } from "../styles";
import { Headline, useCopy } from "../components/CopyContext";
import "./variants.css";

const RAIL = [
  { k: "CRM architecture", t: "GoHighLevel · HubSpot · Close" },
  { k: "Automation", t: "Routing · enrichment · alerts" },
  { k: "Reporting", t: "Pipeline · cohort · attribution" },
  { k: "Call intelligence", t: "Transcripts written to fields" },
  { k: "Custom software", t: "When no tool exists" },
];

export default function V1Rail({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  // button shape comes from the theme's --radius-btn, not from a prop
  return (
    <section className="hero v1">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <Nav />
        <div className="v1-body">
          <div className="v1-left">
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
          <aside className="v1-rail rise rise-4">
            {RAIL.map((r, i) => (
              <div className="v1-row" key={r.k}>
                <span className="v1-idx mono">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="v1-k">{r.k}</div>
                  <div className="v1-t mono">{r.t}</div>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}
