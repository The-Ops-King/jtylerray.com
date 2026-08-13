import GridBackdrop from "../components/GridBackdrop";
import Nav, { EMAIL } from "../components/Nav";
import { STYLES, type StyleDef } from "../styles";
import { Headline, useCopy } from "../components/CopyContext";
import "./variants.css";

/** Bleed — text held left on an open sheet. The portrait that used to run off
 *  the right edge is gone; the type and the frame carry the composition. */
export default function L9Bleed({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  return (
    <section className="hero l9">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <Nav />
        <div className="l9-body">
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
      </div>
    </section>
  );
}
