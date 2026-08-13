import { useEffect, useRef } from "react";
import type { BackdropMode } from "../styles";
import "./grid.css";

type Props = {
  /** which texture the active style calls for */
  mode?: BackdropMode;
  /** cell size in px (grid mode) */
  cell?: number;
  /** how far layers drift with the pointer, in px */
  drift?: number;
  /** darken the edges so the centre reads cleanly */
  vignette?: boolean;
  /** accent crosshairs at every Nth intersection (grid mode) */
  crosshairs?: number | false;
  /** a single accent axis line, as a % of width */
  axis?: number | false;
  /** draw the ruler ticks along the top and left edges */
  ticks?: boolean;
  /** hold the sheet to the viewport instead of to the parent, so one sheet
   *  can run behind the whole page rather than one per section */
  fixed?: boolean;
};

export default function GridBackdrop({
  mode = "grid",
  cell = 48,
  drift = 14,
  vignette = true,
  crosshairs = 4,
  axis = false,
  ticks = true,
  fixed = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let mx = -9999;
    let my = -9999;
    let gate = 0;

    // The lens is kept off the text by measuring the column it must clear,
    // not by a viewport percentage — the copy is content-width, so on a
    // narrower window it reaches further across and a fixed fraction either
    // lets the lens onto the lede or bans it from the page entirely.
    let guard = 0;
    const measure = () => {
      const col = document.querySelector("[data-lens-guard]");
      const past = col ? col.getBoundingClientRect().right + 24 : window.innerWidth * 0.6;
      // never left of centre, whatever the column measures
      guard = Math.max(past, window.innerWidth * 0.5);
    };
    measure();

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * drift;
      ty = (e.clientY / window.innerHeight - 0.5) * drift;
      // pointer in the backdrop's own space — it is inset -80px on every side
      mx = e.clientX + 80;
      my = e.clientY + 80;
      // fade the lens in over the 160px past the column, rather than clipping
      const t = (e.clientX - guard) / 160;
      gate = t < 0 ? 0 : t > 1 ? 1 : t;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // Every custom property is written in the same frame. The lens subtracts
    // the drift from its own position, so writing the pointer on the event and
    // the drift on the next animation frame left the two a frame apart — which
    // read as the disc lagging and sitting off the cursor while moving.
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--px", `${cx.toFixed(2)}px`);
      el.style.setProperty("--py", `${cy.toFixed(2)}px`);
      el.style.setProperty("--mx", `${mx}px`);
      el.style.setProperty("--my", `${my}px`);
      el.style.setProperty("--lens-gate", gate.toFixed(3));
      raf = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(tick) : 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [drift]);

  const showGrid = mode === "grid";

  return (
    <div
      ref={ref}
      className={`backdrop${fixed ? " is-fixed" : ""}`}
      data-mode={mode}
      style={
        {
          "--cell": `${cell}px`,
          "--cell-lg": `${cell * (typeof crosshairs === "number" ? crosshairs : 4)}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {showGrid && <div className="backdrop-grid" />}
      {/* the same grid again, revealed only within an inch of the pointer */}
      {showGrid && <div className="backdrop-lens" />}
      {showGrid && crosshairs !== false && <div className="backdrop-nodes" />}
      {showGrid && axis !== false && <div className="backdrop-axis" style={{ left: `${axis}%` }} />}

      {mode === "frame" && (
        <>
          <div className="backdrop-frame" />
          <div className="backdrop-frame-inner" />
        </>
      )}

      {mode === "aurora" && (
        <>
          <div className="backdrop-glow glow-a" />
          <div className="backdrop-glow glow-b" />
        </>
      )}

      {mode === "rule" && <div className="backdrop-fine" />}

      {/* measurement ticks belong to both ruled and gridded canvases */}
      {ticks && (mode === "rule" || mode === "grid") && (
        <>
          <div className="backdrop-ticks ticks-top" />
          <div className="backdrop-ticks ticks-left" />
        </>
      )}

      {mode === "halo" && (
        <>
          <div className="backdrop-coarse" />
          <div className="backdrop-halo" />
        </>
      )}

      {vignette && showGrid && <div className="backdrop-vignette" />}
    </div>
  );
}
