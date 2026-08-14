import GridBackdrop from "../components/GridBackdrop";
import Nav, { EMAIL } from "../components/Nav";
import { Headline, useCopy } from "../components/CopyContext";
import { STYLES, type StyleDef } from "../styles";
import "./variants.css";

const KV: [string, React.ReactNode][] = [
  ["discipline", "Sales operations and systems engineering"],
  ["builds", "CRM architecture, automations, reporting, call intelligence, custom software"],
  ["for", "Founders running high-ticket coaching and education teams"],
  ["method", "Say what was broken. Then show what was built."],
  [
    "ceiling",
    <>
      <span className="accent mono">none</span> — when the no-code tools run out of road, I write
      code
    </>,
  ],
];

export default function V4Ledger({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  return (
    <section className="hero v4">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <Nav descriptor={false} />
        <div className="v4-body">
          <p className="eyebrow rise rise-1">{copy.eyebrow}</p>
          <h1 className="display md rise rise-2">
            <Headline />
          </h1>
          <div className="v4-kv rise rise-3">
            {KV.map(([k, v]) => (
              <div className="v4-row" key={k}>
                <div className="v4-k mono">{k}</div>
                <div className="v4-v">{v}</div>
              </div>
            ))}
          </div>
          <div className="btns rise rise-4">
            <a className="btn btn-accent" href={`mailto:${EMAIL}`}>
              Get in touch
            </a>
            <a className="btn btn-ghost" href="#work">
              See the work
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
