import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./themes.css";

/**
 * Three targets from one source: VITE_CARD=1 builds the contact card (/card),
 * VITE_LAB=1 builds the exploration lab (/brand-1), and the default is the
 * page itself (/new-home).
 *
 * The roots are imported dynamically so each build carries only its own tree.
 * With static imports the card shipped the whole site — portrait, logo wall
 * and all — because every root sat in the same module graph.
 */
const load = import.meta.env.VITE_CARD
  ? () => import("./card/Card")
  : import.meta.env.VITE_LAB
    ? () => import("./Lab")
    : () => import("./App");

const { default: Root } = await load();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
