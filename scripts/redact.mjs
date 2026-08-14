import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Burn the redactions into the review screenshots.
 *
 * The people in these captures never agreed to appear on a public site, so
 * their names and faces come out of the pixels rather than being covered by
 * something on the page. A CSS blur would ship the clean image and hide it
 * behind a filter, which is not redaction — it is a locked door with the key
 * in it.
 *
 * Originals live in redaction/originals/ and are never imported by the app.
 * This writes the redacted copies over src/assets/reviews/, which is what the
 * bundle picks up. Rerunnable: it always reads from the originals.
 *
 *   node scripts/redact.mjs         write the files
 *   node scripts/redact.mjs --check print each region's pixel box and stop
 *
 * Boxes are fractions of the image (0-1), so they survive a rescaled capture
 * and read as "the top-left eighth" rather than as forty magic numbers.
 */

const SRC = "redaction/originals";
const OUT = "src/assets/reviews";

/**
 * Redactions are flat bars, not blur. A blurred name reads as a smudge — as
 * something that went wrong in the capture — and it still carries the word
 * shape and length. A bar reads as a decision, and carries nothing.
 *
 * Each bar takes a grey lifted off its own screenshot's ground, so it sits in
 * the image rather than on top of it.
 */
const BAR = {
  dark: { r: 58, g: 58, b: 64 },
  light: { r: 198, g: 195, b: 189 },
};

/** which ground each capture came on, so its bars match it */
const TONE = {
  "admin-notes.png": "light",
  "assassin.png": "light",
  "better-than-jm.png": "light",
  "cheat-code.png": "light",
  "devin-power-outage.png": "dark",
  "leaderboard-approved.png": "dark",
  "leaderboard-hires.png": "dark",
  "light-in-the-dark.jpg": "dark",
  "like-gold.png": "light",
  "niann-outbound.png": "dark",
  "niann-pipeline.png": "dark",
  "nyree-recommendations.png": "dark",
  "results-of-training.png": "light",
  "second-mentor.png": "light",
  "zach-any-closer-role.jpg": "dark",
};

/** [x, y, w, h] as fractions of width/height */
const REDACTIONS = {
  // ── Slack: avatar and author line top-left, mentions inside the body ──
  "nyree-recommendations.png": [
    [0.0, 0.0, 0.26, 0.19], // avatar + "Nyree Chupp" + timestamp
  ],
  "devin-power-outage.png": [
    [0.0, 0.0, 0.33, 0.09], // avatar + "Devin Bray"
    [0.39, 0.15, 0.4, 0.06], // the second chip on the submitting line
    [0.45, 0.195, 0.38, 0.06], // the same name again in the first body line
    [0.0, 0.83, 0.36, 0.09], // reply avatar + "Kate Enriquez"
  ],
  "niann-pipeline.png": [
    [0.0, 0.0, 0.34, 0.19], // avatar + "Niann Matson"
  ],
  "niann-outbound.png": [
    [0.0, 0.0, 0.42, 0.14], // avatar + "Niann Matson"
  ],
  // ── Slack leaderboards: every name but mine ──
  // every row runs to the right edge: the first pass sized each box to the
  // name it meant to cover, and the rows carrying two names spilled past it
  "leaderboard-approved.png": [
    [0.0, 0.04, 0.42, 0.11], // avatar + "Lucas Fischer" + timestamp
    [0.17, 0.245, 0.83, 0.075], // Top Closer
    [0.23, 0.315, 0.77, 0.075], // Most Referrals
    [0.29, 0.385, 0.71, 0.075], // Top AM Exp. Score
    [0.25, 0.585, 0.75, 0.075], // Most RC Hires
    [0.26, 0.655, 0.74, 0.075], // Most RAM Hires
    [0.32, 0.725, 0.68, 0.075], // Highest RAM NPS Avg
    [0.0, 0.85, 0.36, 0.15], // reply avatars
  ],
  "leaderboard-hires.png": [
    [0.39, 0.14, 0.61, 0.15], // Most Interviews Approved
    [0.28, 0.46, 0.72, 0.15], // Most RAM Hires — two names
    [0.36, 0.62, 0.64, 0.15], // Highest RAM NPS Avg
  ],
  // ── Messenger ──
  "zach-any-closer-role.jpg": [
    [0.0, 0.0, 0.42, 0.24], // avatar + "Zach Brown" + active line
    [0.0, 0.62, 0.11, 0.32], // avatar beside the message
    [0.9, 0.82, 0.1, 0.18], // read receipt avatar
  ],
  "light-in-the-dark.jpg": [
    [0.0, 0.35, 0.13, 0.42], // sender avatar
    [0.9, 0.85, 0.1, 0.15], // read receipt avatar
  ],
  // ── Facebook comment ──
  "better-than-jm.png": [
    [0.0, 0.1, 0.13, 0.75], // avatar
    [0.11, 0.05, 0.33, 0.42], // "Harinder Singh"
  ],
  // ── WhatsApp: avatars, and the two words that cannot stay ──
  "cheat-code.png": [
    [0.63, 0.48, 0.16, 0.45], // "fucking"
  ],
  "like-gold.png": [
    [0.0, 0.25, 0.06, 0.6], // avatar
    [0.11, 0.13, 0.14, 0.42], // the word — the first pass left its last letter
  ],
  "second-mentor.png": [
    [0.0, 0.25, 0.06, 0.6], // avatar
  ],
  "admin-notes.png": [
    [0.09, 0.55, 0.09, 0.35], // reaction avatar
  ],
  "results-of-training.png": [],
  "assassin.png": [],
};

const check = process.argv.includes("--check");

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f));

for (const file of files) {
  const src = join(SRC, file);
  const boxes = REDACTIONS[file];
  if (!boxes) {
    console.error(`! ${file}: no entry in REDACTIONS — refusing to guess`);
    process.exitCode = 1;
    continue;
  }

  const image = sharp(src);
  const { width, height } = await image.metadata();

  const parts = [];
  for (const [fx, fy, fw, fh] of boxes) {
    // clamp to the image: a box that runs off the edge is an extract error,
    // and rounding at three decimal places is enough to cause one
    const left = Math.max(0, Math.round(fx * width));
    const top = Math.max(0, Math.round(fy * height));
    const w = Math.min(Math.round(fw * width), width - left);
    const h = Math.min(Math.round(fh * height), height - top);
    if (w <= 0 || h <= 0) continue;

    const tone = TONE[file] || "dark";
    const patch = await sharp({
      create: { width: w, height: h, channels: 4, background: { ...BAR[tone], alpha: 1 } },
    })
      .png()
      .toBuffer();
    parts.push({ input: patch, left, top });
    if (check) console.log(`  ${file}  ${left},${top} ${w}x${h}  ${tone} bar`);
  }

  if (check) continue;

  const out = join(OUT, file);
  await image.composite(parts).toFile(out + ".tmp");
  const { rename } = await import("node:fs/promises");
  await rename(out + ".tmp", out);
  console.log(`✓ ${file}  ${parts.length} region${parts.length === 1 ? "" : "s"}`);
}
