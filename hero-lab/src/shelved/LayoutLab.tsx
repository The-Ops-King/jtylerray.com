/**
 * SHELVED — the six-layout switcher.
 *
 * Not mounted anywhere right now. We're holding the 01 "rail" layout still
 * while the styling is worked out; this file keeps the other five layouts and
 * the 1–6 / arrow-key switcher intact so we can drop straight back into layout
 * exploration later.
 *
 * To bring it back: render <LayoutLab /> from App.tsx instead of <Hero />.
 * Layouts live in ../variants/. Accent + style switching is in App.tsx and is
 * independent of this file.
 */
import { useEffect, useState } from "react";
import V1Rail from "../variants/V1Rail";
import V2Stage from "../variants/V2Stage";
import V3Panel from "../variants/V3Panel";
import V4Ledger from "../variants/V4Ledger";
import V5Index from "../variants/V5Index";
import V6Signal from "../variants/V6Signal";

const LAYOUTS = [
  { id: 1, name: "rail", el: <V1Rail /> },
  { id: 2, name: "stage", el: <V2Stage /> },
  { id: 3, name: "panel", el: <V3Panel /> },
  { id: 4, name: "ledger", el: <V4Ledger /> },
  { id: 5, name: "index", el: <V5Index /> },
  { id: 6, name: "signal", el: <V6Signal /> },
];

function fromHash() {
  const n = Number(window.location.hash.replace("#v", ""));
  return LAYOUTS.some((l) => l.id === n) ? n : 1;
}

export default function LayoutLab() {
  const [active, setActive] = useState(fromHash);

  useEffect(() => {
    window.location.hash = `v${active}`;
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (LAYOUTS.some((l) => l.id === n)) setActive(n);
      if (e.key === "ArrowRight") setActive((a) => (a % LAYOUTS.length) + 1);
      if (e.key === "ArrowLeft") setActive((a) => ((a - 2 + LAYOUTS.length) % LAYOUTS.length) + 1);
    };
    const onHash = () => setActive(fromHash());
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const current = LAYOUTS.find((l) => l.id === active)!;

  return (
    <>
      <div key={active}>{current.el}</div>
      <div className="switcher" style={{ bottom: 64 }}>
        {LAYOUTS.map((l) => (
          <button key={l.id} data-on={l.id === active} onClick={() => setActive(l.id)}>
            {String(l.id).padStart(2, "0")}
          </button>
        ))}
        <span className="sep" />
        <span className="name">{current.name}</span>
      </div>
    </>
  );
}
