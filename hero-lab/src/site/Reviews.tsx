import { useEffect, useMemo, useRef, useState } from "react";
/* the data is receipts.ts, not reviews.ts: this filesystem is case
   insensitive, so ./Reviews and ./reviews are the same module to the
   resolver, and the import below quietly landed on the wrong one */
import { REVIEWS, type Review } from "./receipts";
import "./reviews.css";

const GAP = 10;

/**
 * Two kinds of capture are on this wall and they cannot share a row height.
 *
 * The blocks — Slack shoutouts, leaderboards — are 1.5:1 to 3.5:1 and want a
 * tall row. The strips are one-line messages, 5:1 to 7.7:1 and only sixty to
 * eighty pixels tall to begin with; put one in a 250px row and it is that
 * screenshot blown up three times, which is a blurry sentence in a band of
 * nothing.
 *
 * So the two are packed separately, each to its own row height, and the rows
 * are interleaved. Tiles are capped in ratio so a strip's tile is a shape the
 * wall can use, and the image inside is never drawn past its own resolution —
 * the tile's remaining ground is the capture's own colour, so what fills it
 * reads as more of the same screenshot.
 */
const STRIP = 4.5;
const isStrip = (r: Review) => r.w / r.h > STRIP;
const ratioOf = (r: Review) => Math.min(r.w / r.h, isStrip(r) ? 4.2 : 2.8);

/**
 * The wall of receipts, laid out justified — the same way a photo wall is.
 *
 * A bento of fixed cells could not work here: these captures run from 377×60
 * to 1168×434, so every cell was either cropping a screenshot or holding a
 * strip in the middle of an empty square. Instead each row is packed to a
 * target height and then scaled so the row fills the width exactly. Every
 * tile is the shape of its own screenshot, every row edge lines up, and the
 * block ends flush — no empty corner, nothing floating in air.
 *
 * The last row is justified too. A short final row left to sit at its natural
 * height is the ragged corner this replaced.
 */
export default function Reviews() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = useMemo(() => build(width), [width]);

  return (
    <div className="wallboard" ref={ref}>
      {width > 0 &&
        rows.map((row, i) => (
          <div className="wall-row" key={i} style={{ height: `${row.height}px` }}>
            {row.items.map((r) => (
              <figure
                className="rev"
                data-tone={r.tone}
                key={r.src}
                style={{
                  /* one tile per row means the row is the width: no ratio cap,
                     because the tile and the screenshot are the same shape */
                  width: row.items.length === 1 ? "100%" : `${ratioOf(r) * row.height}px`,
                  background: r.bg,
                }}
              >
                <img
                  className="rev-img"
                  src={r.src}
                  alt={r.alt}
                  width={r.w}
                  height={r.h}
                  /* never drawn past its own pixels: these are small captures,
                     and an upscaled screenshot looks like a bad screenshot */
                  style={{ maxWidth: `${r.w}px`, maxHeight: `${r.h}px` }}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        ))}
    </div>
  );
}

type Row = { items: Review[]; height: number };

/**
 * Pack the blocks and the strips separately, then deal the rows out together
 * so the wall alternates instead of running eight blocks and then seven
 * one-liners.
 */
function build(width: number): Row[] {
  if (width <= 0) return [];

  // A phone gets one per row, at the screenshot's own shape. Two 165px-wide
  // tiles side by side is a Slack message set at four point: legible as an
  // arrangement, useless as a sentence. The ratio cap comes off here too —
  // with one tile per row the tile is the screenshot.
  if (width < 620) {
    return REVIEWS.map((r) => ({ items: [r], height: width / (r.w / r.h) }));
  }

  const blocks = justify(
    REVIEWS.filter((r) => !isStrip(r)),
    width,
    Math.max(150, Math.min(300, width / 3.6))
  );
  const strips = justify(
    REVIEWS.filter(isStrip),
    width,
    Math.max(72, Math.min(150, width / 9))
  );

  // Deal alternating, opening with whichever group the first entry in REVIEWS
  // belongs to. The order in receipts.ts is editorial — the receipts that
  // evidence the work lead, see the note there — and those are all strips, so
  // always opening on a block row threw that ordering away at the one place a
  // reader could see it.
  const [first, second] = isStrip(REVIEWS[0]) ? [strips, blocks] : [blocks, strips];

  const out: Row[] = [];
  const max = Math.max(first.length, second.length);
  for (let i = 0; i < max; i++) {
    if (first[i]) out.push(first[i]);
    if (second[i]) out.push(second[i]);
  }
  return out;
}

/**
 * Greedy justified packing: fill a row until scaling it to the container
 * width would push it below the target height, then close it.
 *
 * The target is a function of the width rather than a constant — at 1280px a
 * 150px row is a strip of unreadable type, and on a phone a 260px row is one
 * screenshot per screen.
 */
function justify(items: Review[], width: number, target: number): Row[] {
  if (width <= 0) return [];
  const rows: Row[] = [];
  let run: Review[] = [];
  let ratioSum = 0;

  for (const item of items) {
    run.push(item);
    ratioSum += ratioOf(item);
    const height = (width - GAP * (run.length - 1)) / ratioSum;
    if (height <= target) {
      rows.push({ items: run, height });
      run = [];
      ratioSum = 0;
    }
  }

  // whatever is left still fills the width: a last row at its natural height
  // is exactly the empty corner this layout exists to avoid
  if (run.length) {
    rows.push({ items: run, height: (width - GAP * (run.length - 1)) / ratioSum });
  }

  // A leftover row of one is a single tile stretched the whole way across,
  // which is the ragged corner again wearing a different hat. Fold it into
  // the row above and let that row settle a little shorter.
  if (rows.length > 1 && rows[rows.length - 1].items.length === 1) {
    const last = rows.pop()!;
    const prev = rows[rows.length - 1];
    prev.items = [...prev.items, ...last.items];
    const sum = prev.items.reduce((a, r) => a + ratioOf(r), 0);
    prev.height = (width - GAP * (prev.items.length - 1)) / sum;
  }
  return rows;
}
