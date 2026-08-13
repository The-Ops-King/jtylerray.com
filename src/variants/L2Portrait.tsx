import GridBackdrop from "../components/GridBackdrop";
import Nav, { EMAIL } from "../components/Nav";
import { STYLES, type StyleDef } from "../styles";
import headshot from "../assets/headshot.jpeg";
import { Headline, useCopy } from "../components/CopyContext";
import "./variants.css";

/** Portrait split — the person is the proof. Text left, headshot right in a
 *  hairline frame with a mono caption plate under it. */
export default function L2Portrait({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  return (
    <section className="hero l2">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <Nav />
        <div className="l2-body">
          <div className="l2-left">
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

          <figure className="l2-portrait rise rise-4">
            <div className="l2-frame">
              <img src={headshot} alt="J. Tyler Ray" />
            </div>
            <figcaption>
              <span className="mono">J. Tyler Ray</span>
              <span className="mono l2-cap-dim">Sales operations · Austin</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
