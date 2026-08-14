import { useEffect } from "react";
import { ACCENTS, applyAccent } from "./accents";
import Site from "./site/Site";

/**
 * The page. Layout lives in site/, copy in site/content.ts, tokens in
 * index.css. The exploration lab (every alternative style, layout, copy and
 * accent) is still Lab.tsx, built with VITE_LAB=1.
 *
 * Branding is the lab's blueprint style, held by data-style on <html>: the
 * graph-paper sheet, the ruler ticks and the four corner crop marks. The
 * accent stays the deep green, which is the page's own, not the lab default.
 */
export default function App() {
  useEffect(() => {
    document.documentElement.setAttribute("data-style", "blueprint");
    const forest = ACCENTS.find((a) => a.id === "green") ?? ACCENTS[0];
    applyAccent(forest.hex, forest.gradient, forest.text);
  }, []);

  return <Site />;
}
