import { useEffect } from "react";
import { ACCENTS, applyAccent } from "./accents";
import { STYLES } from "./styles";
import { COPY } from "./copy";
import { CopyContext } from "./components/CopyContext";
import L9Bleed from "./variants/L9Bleed";

/**
 * The hero, decided: blueprint sheet, bleed composition, underscore eyebrow,
 * accent-coloured mark, deep green accent, hybrid copy. Every alternative
 * still lives in its own module (styles.ts, copy.ts, accents.ts, variants/)
 * and the full switcher is Lab.tsx, built with VITE_LAB=1.
 *
 * The sheet and pointer-lens values were tuned with a slider panel that has
 * since been removed; the settled numbers are the :root defaults in
 * index.css — --grid-a, --lens-r, --lens-a.
 */
export default function App() {
  const style = STYLES[0];
  const copy = COPY[0];

  useEffect(() => {
    document.documentElement.setAttribute("data-style", style.id);
    const green = ACCENTS.find((a) => a.id === "green") ?? ACCENTS[0];
    applyAccent(green.hex, green.gradient, green.text);
  }, [style.id]);

  return (
    <CopyContext.Provider value={copy}>
      <div data-mark="color" data-eyebrow="underscore">
        <L9Bleed style={style} />
      </div>
    </CopyContext.Provider>
  );
}
