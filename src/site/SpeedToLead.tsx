import { useEffect, useRef, useState } from "react";

/**
 * Speed to lead, as two clocks.
 *
 * The automated side stops at 1:30 and the manual side keeps going. That
 * contrast is the whole message, so it needs no caption.
 *
 * The clocks run on a compressed scale (one second of real time is a minute
 * of the comparison) because the point only lands if a visitor sees the
 * automated column stop. Both columns run on the same scale, so the ratio on
 * screen is the ratio being described.
 */

const SCALE = 60; // 1s real = 1min shown
const AUTOMATED_STOP = 90; // seconds, shown
const RESET_AT = 4 * 60 * 60; // four hours, shown

const clock = (totalSeconds: number) => {
  const s = Math.floor(totalSeconds);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

export default function SpeedToLead() {
  const wrap = useRef<HTMLDivElement>(null);
  const manual = useRef<HTMLSpanElement>(null);
  const automated = useRef<HTMLSpanElement>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (still) return;
    const el = wrap.current;
    if (!el) return;

    let raf = 0;
    let start = 0;

    const frame = (now: number) => {
      if (!start) start = now;
      let shown = ((now - start) / 1000) * SCALE;
      if (shown > RESET_AT) {
        start = now;
        shown = 0;
      }
      if (manual.current) manual.current.textContent = clock(shown);
      // the automated side reaches 1:30 and stops there
      if (automated.current) automated.current.textContent = clock(Math.min(shown, AUTOMATED_STOP));
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !raf) raf = requestAnimationFrame(frame);
        if (!entry.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [still]);

  return (
    <div className="stl" ref={wrap}>
      <div className="stl-col">
        <span className="mono stl-label">Manual</span>
        <span className="mono stl-time" ref={manual}>
          {clock(still ? RESET_AT : 0)}
        </span>
      </div>
      <div className="stl-col">
        <span className="mono stl-label">Automated</span>
        <span className="mono stl-time stl-time-live" ref={automated}>
          {clock(still ? AUTOMATED_STOP : 0)}
        </span>
      </div>
    </div>
  );
}
