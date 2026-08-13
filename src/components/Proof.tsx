/**
 * The proof panel — one cropped screenshot of a real system, held in the
 * right column of the hero.
 *
 * The image is picked up from disk rather than imported, so the panel appears
 * the moment a file lands and renders nothing until then. An empty right
 * column is the correct state while there is no real screenshot: filling it
 * with an effect would be decoration standing in for evidence.
 *
 * To ship it:
 *   1. drop the screenshot at src/assets/proof.{png,jpg,jpeg,webp}
 *      — cropped tight to one meaningful region, not a whole browser window,
 *        and with client data scrubbed
 *   2. set CAPTION below to what it is: "Call scoring pipeline",
 *      "Lead routing map", "Pipeline stage gates"
 */

const CAPTION = "Call scoring pipeline";

/* eager glob: resolves to {} when no file matches, so this stays build-safe */
const found = import.meta.glob<{ default: string }>("../assets/proof.{png,jpg,jpeg,webp}", {
  eager: true,
});
const src = Object.values(found)[0]?.default;

/** true when there is a real screenshot to show — the layout uses this to
 *  decide whether the hero is one column or two */
export const HAS_PROOF = Boolean(src);

export default function Proof() {
  if (!src) return null;
  return (
    <figure className="proof rise rise-3">
      <div className="proof-panel">
        <img src={src} alt={CAPTION} />
      </div>
      <figcaption className="proof-caption mono">{CAPTION}</figcaption>
    </figure>
  );
}
