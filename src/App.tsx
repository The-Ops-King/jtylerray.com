import { useEffect, useState } from "react";
import { ACCENTS, applyAccent } from "./accents";
import { STYLES } from "./styles";
import { COPY } from "./copy";
import { CopyContext } from "./components/CopyContext";
import L9Bleed from "./variants/L9Bleed";

/**
 * The hero, decided: blueprint sheet, bleed composition, underscore eyebrow,
 * accent-coloured mark, green accent, hybrid copy. Every alternative still
 * lives in its own module (styles.ts, copy.ts, accents.ts, variants/) and the
 * full switcher is Lab.tsx, built with `vite build --mode lab`.
 */

/** grid opacity, as a multiplier of the designed value — temporary control.
 *  Key is versioned: the sheet was retuned, so an old stored value would
 *  quietly reinstate the heavy grid. */
const GRID_KEY = "jtr-grid-op-3";
const GRID_DEFAULT = 40;

export default function App() {
  const style = STYLES[0];
  const copy = COPY[0];
  const [gridOp, setGridOp] = useState(
    () => Number(localStorage.getItem(GRID_KEY) ?? GRID_DEFAULT)
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-style", style.id);
    const green = ACCENTS.find((a) => a.id === "green") ?? ACCENTS[0];
    applyAccent(green.hex, green.gradient, green.text);
  }, [style.id]);

  useEffect(() => {
    document.documentElement.style.setProperty("--grid-op", String(gridOp / 100));
    localStorage.setItem(GRID_KEY, String(gridOp));
  }, [gridOp]);

  // the designed line alpha, so the readout can show a real value —
  // second figure is the lens at its centre, 1.5× the resting sheet
  const baseAlpha = 0.07;
  const alpha = ((gridOp / 100) * baseAlpha).toFixed(4);
  const lensAlpha = ((gridOp / 100) * 1.5 * baseAlpha).toFixed(4);

  return (
    <>
      <CopyContext.Provider value={copy}>
        <div data-mark="color" data-eyebrow="underscore">
          <L9Bleed style={style} />
        </div>
      </CopyContext.Provider>

      <div className="switcher grid-tuner">
        <div className="switcher-row">
          <span className="group-label mono">grid</span>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={gridOp}
            onChange={(e) => setGridOp(Number(e.target.value))}
          />
          <span className="grid-readout mono">
            {gridOp}% · alpha {alpha} · lens {lensAlpha}
          </span>
        </div>
      </div>
    </>
  );
}
