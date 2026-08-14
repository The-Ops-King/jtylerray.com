import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Tile the redacted screenshots onto a couple of sheets, so a redaction pass
 * can be checked in two looks instead of fifteen. Working file: the sheets go
 * to redaction/sheets/ and are never shipped.
 *
 *   node scripts/contact-sheet.mjs
 */

const DIR = "src/assets/reviews";
const OUT = "redaction/sheets";
const COL_W = 620;
const PER_SHEET = 5;
const PAD = 16;

await mkdir(OUT, { recursive: true });
const files = (await readdir(DIR)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();

for (let s = 0; s * PER_SHEET < files.length; s++) {
  const batch = files.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
  const rows = [];
  for (const f of batch) {
    const img = sharp(join(DIR, f));
    const { width, height } = await img.metadata();
    const scale = Math.min(1, COL_W / width);
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    rows.push({ buf: await img.resize(w, h).toBuffer(), w, h, f });
  }
  const total = rows.reduce((a, r) => a + r.h + PAD, PAD);
  let y = PAD;
  const parts = rows.map((r) => {
    const p = { input: r.buf, left: PAD, top: y };
    y += r.h + PAD;
    return p;
  });
  const out = join(OUT, `sheet-${s + 1}.png`);
  await sharp({
    create: { width: COL_W + PAD * 2, height: total, channels: 3, background: "#2a2a2a" },
  })
    .composite(parts)
    .toFile(out);
  console.log(`${out}  ${batch.join(", ")}`);
}
