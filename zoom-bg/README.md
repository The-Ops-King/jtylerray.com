# Zoom background

A 1920x1080 looping MP4 of the site's frame, with the accent scan line taken
off the bottom edge and put on a circuit around the whole frame. One green
comet, one lap every 14 seconds, no seam where the loop repeats.

Rendered output: `out/jtr-zoom-bg-1080p.mp4`

## Files

| file | what it is |
| --- | --- |
| `scene.html` | the frame and the beam. Everything visual lives here. |
| `render.mjs` | steps the scene frame by frame and encodes the MP4 |
| `fonts/` | Inter Tight and JetBrains Mono, latin subset, vendored |
| `out/` | the rendered video |

## Rendering

```sh
cd zoom-bg
npm install
npm run render
```

The render needs a Chromium binary. It uses whatever Playwright has installed;
if yours lives somewhere unusual, point at it:

```sh
CHROMIUM_PATH=/path/to/chrome npm run render
```

Flags, all optional:

```sh
node render.mjs --out out/other.mp4 --fps 30 --seconds 20 --crf 16
```

Roughly three minutes for 420 frames.

## Changing it

Everything worth changing is at the top of the `SCENE` object in
`scene.html`: loop length, frame rate, the frame inset, and the beam's
length, colour and tail shape. The text sits in the markup below it.

`render.mjs` reads `SCENE` off the page rather than keeping its own copy, so
editing the scene is enough. The one thing that has to stay in sync by hand is
`SCENE.frame`, which must match `--fx` / `--fy` / `--fr` / `--fb` in the
stylesheet, since CSS positions the brackets and JS positions the beam.

## Installing it in Zoom

Zoom desktop, Settings, Background & Effects, then the `+` above the thumbnail
grid and Add Video. Pick the MP4. Zoom loops it on its own.

## Notes

The loop has no seam because nothing in the pipeline reads a clock. The page
exposes `setFrame(i)` and `render.mjs` calls it with an integer, so frame 0 and
frame 420 are the same picture rather than nearly the same one. It also means
two runs produce identical output.

Two things in the scene are drawn for the encoder rather than for a screen. The
beam core is 2px instead of the site's 1px, because H.264 subsamples chroma
2x2 and a 1px green line arrives at the other end of the call grey. The grid
and ticks sit a few alpha steps brighter than the site's for the same reason.
There is also a layer of static grain over the vignette, which stops the
gradient banding into rings. Since the grain never changes between frames, the
encoder pays for it once in the keyframe and nothing after.

If your own preview looks mirrored, that is Zoom's self view, not the file.
Settings, Video, uncheck "Mirror my video". Everyone else already sees it the
right way round.

The beam runs the rectangle the corner brackets mark, about 66px in from the
true edge, rather than the literal edge of the frame. If a call ever composites
at something other than a clean 16:9, the crop takes empty margin instead of
taking the beam.
