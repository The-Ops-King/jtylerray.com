import GridBackdrop from "../components/GridBackdrop";
import { EMAIL } from "../components/Nav";
import { STYLES, type StyleDef } from "../styles";
import { Headline, useCopy } from "../components/CopyContext";
import "./variants.css";

/** Cover — no nav bar. The headline fills the viewport, the monogram sits top
 *  left, and everything transactional is pinned to a bottom rule. */
export default function L10Cover({ style = STYLES[0] }: { style?: StyleDef }) {
  const copy = useCopy();
  return (
    <section className="hero l10">
      <GridBackdrop
        mode={style.backdrop}
        cell={style.cell ?? 48}
        crosshairs={style.crosshairs ?? 4}
        drift={style.drift ?? 14}
        ticks={style.marks !== false}
      />
      <div className="shell">
        <div className="l10-top rise rise-1">
          <div className="l10-mark" role="img" aria-label="J. Tyler Ray monogram" />
          <span className="mono l10-desc">{copy.eyebrow}</span>
        </div>

        <div className="l10-body">
          <h1 className="display l10-h1 rise rise-2">
            <Headline />
          </h1>
        </div>

        <div className="l10-foot rise rise-4">
          <p className="lede l10-lede">{copy.lede}</p>
          <div className="btns">
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
