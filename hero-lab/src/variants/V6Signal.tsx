import GridBackdrop from "../components/GridBackdrop";
import Nav, { EMAIL } from "../components/Nav";
import { STYLES, type StyleDef } from "../styles";
import { Headline, useCopy } from "../components/CopyContext";
import "./variants.css";

const READOUT = [
  ["systems live", "24/7"],
  ["stack", "GHL · HubSpot · Close · Supabase"],
  ["writes code", "TS · Python · SQL"],
];

export default function V6Signal({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  return (
    <section className="hero v6">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <Nav pill />
        <div className="v6-body">
          <p className="eyebrow rise rise-1">{copy.eyebrow}</p>
          <h1 className="display v6-h1 rise rise-2">
            <Headline />
          </h1>
          <p className="lede rise rise-3">{copy.lede}</p>
          <div className="btns rise rise-4">
            <a className="btn btn-accent pill" href={`mailto:${EMAIL}`}>
              Get in touch
            </a>
            <a className="btn btn-ghost pill" href="#work">
              See the work
            </a>
          </div>
        </div>

        <div className="v6-readout rise rise-4">
          <div className="v6-scan" />
          {READOUT.map(([k, v]) => (
            <div className="v6-cell" key={k}>
              <span className="v6-k mono">{k}</span>
              <span className="v6-v mono">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
