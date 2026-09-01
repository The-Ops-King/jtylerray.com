/**
 * Render scene.html to a looping MP4 for use as a Zoom virtual background.
 *
 *   node render.mjs [--out path] [--fps N] [--seconds N] [--crf N]
 *
 * How it works, and why this way:
 *
 *   The page never animates itself. It exposes `setFrame(i)`, and this script
 *   steps the frame index, screenshots, and pipes the PNG straight into
 *   ffmpeg's stdin. Nothing reads a wall clock anywhere in the pipeline, so
 *   the output is byte-identical run to run and frame 0 and frame N are the
 *   same picture — which is the whole trick to a Zoom loop with no visible
 *   seam. Capturing a real-time CSS animation could not promise either.
 *
 *   The page is served over HTTP rather than opened as file://, so the
 *   vendored woff2 files load under the same rules a browser would normally
 *   apply to them. A file:// page can have its font requests blocked, and the
 *   failure mode is silent: you get Liberation Sans and never find out.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import ffmpegPath from "ffmpeg-static";

const HERE = dirname(fileURLToPath(import.meta.url));

/* Chromium: prefer whatever Playwright has installed, but let an env var win
   so this runs on a machine that keeps its browsers somewhere else. */
const CHROME =
  process.env.CHROMIUM_PATH ||
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  undefined;

const args = parseArgs(process.argv.slice(2));
const OUT = resolve(HERE, args.out ?? "out/jtr-zoom-bg-1080p.mp4");
const CRF = Number(args.crf ?? 16);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

/* ── a static server for the scene directory ───────────────────────────── */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function serve(root) {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      // normalise first, then confine to root: a request for ../../etc/passwd
      // should 403, not read
      const rel = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
      const file = join(root, rel === "/" ? "scene.html" : rel);
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      try {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, "127.0.0.1", () => ok(server));
  });
}

/* ── render ────────────────────────────────────────────────────────────── */

const server = await serve(HERE);
const { port } = server.address();

const browser = await chromium.launch({
  executablePath: CHROME,
  args: [
    "--no-sandbox",
    // the render is one fixed target; leave the GPU out of it so two
    // machines produce the same frames
    "--disable-lcd-text",
    "--force-color-profile=srgb",
    "--disable-partial-raster",
    "--hide-scrollbars",
  ],
});

const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});

await page.goto(`http://127.0.0.1:${port}/scene.html`, { waitUntil: "load" });

// the fonts are the one thing that can still be pending after load, and a
// frame rendered in the fallback face is worse than no frame at all
await page.evaluate(() => document.fonts.ready);

const scene = await page.evaluate(() => window.SCENE);
const fps = Number(args.fps ?? scene.fps);
const seconds = Number(args.seconds ?? scene.durationSeconds);
const totalFrames = Math.round(fps * seconds);

await mkdir(dirname(OUT), { recursive: true });

/* H.264 settings, chosen for what this clip actually is — a thin bright line
   on near-black:
     crf 16 + preset slow  — a hairline on black is exactly what a normal
                             crf throws away first
     yuv420p               — the only chroma format Zoom reliably decodes
     high/4.0 + faststart  — plays anywhere, opens without a full read       */
const ff = spawn(ffmpegPath, [
  "-y",
  "-f", "image2pipe",
  "-framerate", String(fps),
  "-i", "pipe:0",
  "-an",
  "-c:v", "libx264",
  "-preset", "slow",
  "-crf", String(CRF),
  "-pix_fmt", "yuv420p",
  "-profile:v", "high",
  "-level", "4.0",
  "-g", String(fps),
  "-movflags", "+faststart",
  OUT,
], { stdio: ["pipe", "inherit", "pipe"] });

let ffErr = "";
ff.stderr.on("data", (c) => { ffErr += c; });

const done = new Promise((ok, fail) => {
  ff.on("error", fail);
  ff.on("close", (code) =>
    code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}\n${ffErr.slice(-4000)}`)));
});

/** write, respecting backpressure — 420 uncompressed-ish PNGs will outrun the
 *  encoder's pipe buffer otherwise and the process deadlocks */
function write(buf) {
  return ff.stdin.write(buf) ? Promise.resolve()
    : new Promise((ok) => ff.stdin.once("drain", ok));
}

process.stdout.write(`rendering ${totalFrames} frames @ ${fps}fps (${seconds}s loop)\n`);
const started = Date.now();

for (let f = 0; f < totalFrames; f++) {
  await page.evaluate((i) => window.setFrame(i), f);
  await write(await page.screenshot({ type: "png" }));
  if (f % 30 === 0 || f === totalFrames - 1) {
    process.stdout.write(`  ${String(f + 1).padStart(4)}/${totalFrames}\r`);
  }
}

ff.stdin.end();
await done;
await browser.close();
server.close();

process.stdout.write(
  `\ndone in ${((Date.now() - started) / 1000).toFixed(1)}s → ${OUT}\n`);
