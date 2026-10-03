import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SUITE, type Build } from "./content";
import "./work.css";

/**
 * Section 02 · the work, as the split: the whole list on the left, the current
 * build held on the right.
 *
 * The pane follows the list as it scrolls. That reading position is worked out
 * from one rAF-throttled measurement per frame — an IntersectionObserver band
 * was flipping between two rows on the boundary, which read as flashing.
 *
 * Everything that moves is on the pane: the number rolls up, the title and its
 * rule follow, and an accent cursor slides down the list to the live row. The
 * list itself never reflows, so the reading position is stable while all of it
 * happens. Under prefers-reduced-motion the follow and the transitions are off
 * and the pane is set by clicking.
 */

type Row = Build & { n: string; category: string };

const ROWS: Row[] = SUITE.flatMap((area) =>
  area.items.map((item) => ({ ...item, category: area.category, n: "" }))
).map((row, i) => ({ ...row, n: String(i + 1).padStart(2, "0") }));

const COUNT = ROWS.length;
const byArea = (category: string) => ROWS.filter((r) => r.category === category);

/** the reading line, as a fraction of the viewport */
const LINE = 0.42;
const EASE = [0.16, 1, 0.3, 1] as const;

export default function WorkSuite() {
  const [at, setAt] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const row = ROWS[at];

  /* Below 900 the split is one column, and the pane sitting above the list was
     showing the same entry the list was already showing underneath it. There
     the detail opens inside the row instead, which means the reading-position
     follow has to stop: a row that grows as you scroll past it moves the thing
     you were reading. Narrow is tap-to-open. */
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (still || narrow) return;
    const list = listRef.current;
    if (!list) return;

    const rows = Array.from(list.querySelectorAll<HTMLElement>(".spl-row"));
    let raf = 0;
    let last = -1;

    // nearest row centre to the reading line — one pass, one winner, so there
    // is no boundary for two rows to argue over
    const measure = () => {
      raf = 0;
      const line = window.innerHeight * LINE;
      let best = Infinity;
      let hit = 0;
      rows.forEach((el, i) => {
        const box = el.getBoundingClientRect();
        const d = Math.abs(box.top + box.height / 2 - line);
        if (d < best) {
          best = d;
          hit = i;
        }
      });
      if (hit !== last) {
        last = hit;
        setAt(hit);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [still, narrow]);

  return (
    <>
      <div className="work-head">
        <div className="work-head-in">
          <div className="section-label">
            <hr className="section-rule" />
            <span className="mono">02 · The work</span>
          </div>
          {/* the areas are ordered the way a lead moves through them, so the
              meta line says so rather than leaving it to be noticed */}
          <p className="mono work-count">
            {COUNT} builds · {SUITE.length} areas · in the order a lead moves through them
          </p>
        </div>
      </div>

      <div className="split">
        <div className="spl-list" ref={listRef}>
          {SUITE.map((a) => (
            <section className="spl-group" key={a.category}>
              <h4 className="spl-cat mono">{a.category}</h4>
              {byArea(a.category).map((r) => {
                const on = r.n === row.n;
                return (
                  <button
                    key={r.n}
                    className="spl-row"
                    data-on={on}
                    onClick={() => setAt(ROWS.findIndex((x) => x.n === r.n))}
                  >
                    {/* one cursor for the whole list, so it travels between
                        rows instead of blinking on and off in place */}
                    {on && (
                      <motion.span
                        className="spl-cursor"
                        layoutId="spl-cursor"
                        aria-hidden="true"
                        transition={
                          still ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }
                        }
                      />
                    )}
                    <span className="spl-n mono">{r.n}</span>
                    <span className="spl-t">{r.title}</span>
                    {narrow && on && r.detail && (
                      <span className="spl-row-detail">{r.detail}</span>
                    )}
                  </button>
                );
              })}
            </section>
          ))}
        </div>

        <aside className="spl-detail">
          <div className="spl-detail-in">
          {/* The entries crossfade: the outgoing one is still leaving while the
              incoming one arrives, both absolutely placed so neither pushes the
              other around. A mode="wait" swap stalls here, because a container
              with nothing animatable of its own never reports its exit. */}
          <div className="spl-d-body">
            <AnimatePresence initial={false}>
              <motion.div
                className="spl-d-card"
                key={row.n}
                initial={still ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2, ease: EASE } }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <motion.p className="mono spl-d-cat" {...rise(0)}>
                  {row.category}
                </motion.p>

                {/* the number rolls up from below, which reads as a counter
                    advancing rather than a label being replaced */}
                <div className="spl-d-n-clip" aria-hidden="true">
                  <motion.p
                    className="spl-d-n mono"
                    initial={still ? false : { y: "78%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    transition={{ duration: 0.55, ease: EASE, delay: 0.04 }}
                  >
                    {row.n}
                  </motion.p>
                </div>

                <motion.h3 className="spl-d-t" {...rise(0.09)}>
                  {row.title}
                </motion.h3>

                <motion.span
                  className="spl-d-rule"
                  aria-hidden="true"
                  initial={still ? false : { scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
                />

                {row.detail && (
                  <motion.p className="spl-d-line" {...rise(0.16)}>
                    {row.detail}
                  </motion.p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

            <div className="spl-progress" aria-hidden="true">
              <span className="spl-progress-track" />
              <motion.span
                className="spl-progress-fill"
                animate={{ scaleY: (at + 1) / COUNT }}
                transition={{ duration: 0.5, ease: EASE }}
                style={{ originY: 0 }}
              />
              <span className="mono spl-progress-n">
                {row.n} / {COUNT}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ── the motion vocabulary: rise, roll, draw, and nothing else ───────── */

/** the pane's line-by-line arrival, staggered by hand rather than by variant
 *  orchestration, so an exiting card can never hold the next one back */
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: EASE, delay },
});
