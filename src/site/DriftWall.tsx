import "./drift.css";

/**
 * The wall of what the work is built on: a slow drift of monochrome tool
 * marks beside section 01.
 *
 * Three columns, each looping its own track at its own speed, the middle one
 * running against the other two. The loop is a plain CSS translate on three
 * elements rather than a per-tile animation, which keeps it to three
 * composited layers and off the main thread. Nothing here answers the pointer:
 * the wall is texture, and texture that chases the cursor asks to be looked
 * at.
 *
 * Marks: drop SVGs into src/assets/logos/ and they are picked up by filename
 * automatically — `close.svg` fills the CLOSE tile. Until one lands, the tile
 * carries the name set in mono, which is the correct empty state: a wall of
 * real marks or a wall of honest labels, never a wall of fakes.
 */

const TOOLS = [
  ["GoHighLevel", "gohighlevel"],
  ["Close", "close"],
  ["HubSpot", "hubspot"],
  ["Zapier", "zapier"],
  ["Make", "make"],
  ["n8n", "n8n"],
  ["Airtable", "airtable"],
  ["Supabase", "supabase"],
  ["BigQuery", "bigquery"],
  ["Looker", "looker"],
  ["Slack", "slack"],
  ["Notion", "notion"],
  ["Zoom", "zoom"],
  ["Calendly", "calendly"],
  ["Twilio", "twilio"],
  ["Stripe", "stripe"],
  ["Discord", "discord"],
  ["React", "react"],
  ["TypeScript", "typescript"],
  ["Node", "node"],
  ["Sheets", "sheets"],
  ["WooSender", "woosender"],
] as const;

/* eager glob: resolves to {} while the folder is empty, so this stays
   build-safe and the wall falls back to wordmarks. SVG is preferred, but a
   brand without one in the icon sets gets its PNG instead. */
const files = import.meta.glob<{ default: string }>(
  "../assets/logos/*.{svg,png,webp}",
  { eager: true }
);
const logo = (slug: string) => {
  const hit = ["svg", "png", "webp"]
    .map((ext) => Object.entries(files).find(([p]) => p.endsWith(`/${slug}.${ext}`)))
    .find(Boolean);
  return hit?.[1].default;
};

/** deal the tools into three columns, round robin, so no column is one topic */
const COLUMNS = [0, 1, 2].map((c) => TOOLS.filter((_, i) => i % 3 === c));

export default function DriftWall() {
  return (
    <div className="wall" aria-label="Tools the work is built on">
      {COLUMNS.map((col, i) => (
        <div className="wall-col" key={i} data-col={i}>
          {/* the track is doubled: the loop resets on the seam, so the wall
              never shows an edge */}
          <div className="wall-track">
            {[...col, ...col].map(([name, slug], j) => (
              <Tile name={name} slug={slug} key={`${slug}-${j}`} />
            ))}
          </div>
        </div>
      ))}
      <span className="wall-label mono" aria-hidden="true">
        Built on
      </span>
    </div>
  );
}

function Tile({ name, slug }: { name: string; slug: string }) {
  const src = logo(slug);
  return (
    <div className="tile" title={name}>
      {src ? <img src={src} alt="" /> : <span className="tile-name mono">{name}</span>}
    </div>
  );
}
