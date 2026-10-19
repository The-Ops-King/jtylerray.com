import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./themes.css";

/**
 * Five targets from one source: VITE_CARD=1 builds the contact card (/card),
 * VITE_APPLY=1 the closer application (/apply), VITE_RESEARCH=1 the market
 * research form (/research), VITE_LAB=1 the exploration lab (/brand-1), and
 * the default is the page itself (/new-home).
 *
 * The roots are imported dynamically so each build carries only its own tree.
 * With static imports the card shipped the whole site — portrait, logo wall
 * and all — because every root sat in the same module graph.
 */
/* In dev there is one server at base '/', so the path picks the root and
   localhost/card, /apply, /brand-1 and /new-home are all the same port. In a
   build the env flag decides, because each target ships alone. */
const path = location.pathname;
/* Exact match, not a prefix. The site rewrites every unmatched URL to this
   HTML, so `startsWith` meant /cardiology and /brand-1-old both booted a root
   that does not belong at that address. */
const at = (root: string) => path === root || path === root + "/";
const card = import.meta.env.VITE_CARD || at("/card");
const apply = import.meta.env.VITE_APPLY || at("/apply");
const research = import.meta.env.VITE_RESEARCH || at("/research");
const lab = import.meta.env.VITE_LAB || at("/brand-1");

const load = card
  ? () => import("./card/Card")
  : apply
    ? () => import("./apply/Apply")
    : research
      ? () => import("./research/Research")
      : lab
        ? () => import("./Lab")
        : () => import("./App");

const { default: Root } = await load();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
