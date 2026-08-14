/* the data is receipts.ts, not reviews.ts: this filesystem is case
   insensitive, so ./Reviews and ./reviews are the same module to the
   resolver, and the import below quietly landed on the wrong one */
import { REVIEWS } from "./receipts";
import "./reviews.css";

/**
 * The wall of receipts: every screenshot as its own tile, sized by the shape
 * of what it holds.
 *
 * Nothing is retyped and nothing is cropped. A pull quote is something I
 * wrote; a screenshot is something they wrote, and the difference is the
 * whole point of the section.
 */
export default function Reviews() {
  return (
    <div className="wallboard">
      {REVIEWS.map((r) => (
        <figure className="rev" data-tone={r.tone} data-span={r.span} key={r.src}>
          <img
            className="rev-img"
            src={r.src}
            alt={r.alt}
            width={r.w}
            height={r.h}
            loading="lazy"
            decoding="async"
          />
        </figure>
      ))}
    </div>
  );
}
