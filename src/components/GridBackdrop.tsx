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
};

export default function GridBackdrop({
  mode = "grid",
  cell = 48,
  drift = 14,
  vignette = true,
  crosshairs = 4,
  axis = false,
  ticks = true,
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

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * drift;
      ty = (e.clientY / window.innerHeight - 0.5) * drift;
      // pointer in the backdrop's own space — it is inset -80px on every side
      el.style.setProperty("--mx", `${e.clientX + 80}px`);
      el.style.setProperty("--my", `${e.clientY + 80}px`);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--px", `${cx.toFixed(2)}px`);
      el.style.setProperty("--py", `${cy.toFixed(2)}px`);
      raf = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(tick) : 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [drift]);

  const showGrid = mode === "grid";

  return (
    <div
      ref={ref}
      className="backdrop"
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
