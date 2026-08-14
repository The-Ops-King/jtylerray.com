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
/* In dev there is one server at base '/', so the path picks the root and
   localhost/card, /brand-1 and /new-home are all the same port. In a build the
   env flag decides, because each target ships alone. */
const path = location.pathname;
const card = import.meta.env.VITE_CARD || path.startsWith("/card");
const lab = import.meta.env.VITE_LAB || path.startsWith("/brand-1");

const load = card
  ? () => import("./card/Card")
  : lab
    ? () => import("./Lab")
    : () => import("./App");

const { default: Root } = await load();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
