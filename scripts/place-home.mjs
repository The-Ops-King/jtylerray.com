import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prerender, prerenderCard } from './prerender.mjs';

/**
 * Put the new page at the root of the build.
 *
 * A vercel.json rewrite could not do this: Vercel matches the filesystem
 * before it applies rewrites, so `/` always resolved to the Vite build's own
 * dist/index.html and the rewrite never fired. Swapping the file after the
 * build is the part of that pipeline we control.
 *
 * The old landing app is kept, not deleted — it moves to /legacy (rewritten
 * in vercel.json) so it stays reachable while the new page is the front door.
 *
 * The new page's assets keep their /new-home/ base and still live there; only
 * the HTML moves, and it references them by absolute path.
 *
 * The copy is written into the root HTML on the way past — see prerender.mjs
 * for why. It happens here rather than in the hero-lab build because only the
 * root copy is the page at jtylerray.com; the file left at /new-home/ is a
 * build artifact and stays as the build made it.
 */

const dist = resolve(process.cwd(), 'dist');
const legacy = resolve(dist, 'legacy.html');
const root = resolve(dist, 'index.html');
const page = resolve(dist, 'new-home/index.html');

await copyFile(root, legacy);
await copyFile(page, root);

const html = await readFile(root, 'utf8');
await writeFile(root, await prerender(html, { root: process.cwd(), dist }));

/* the card is the site's other public URL, and it ships from the same shared
   index.html — so it arrives carrying the page's title until this fixes it */
const card = resolve(dist, 'card/index.html');
const cardHtml = await readFile(card, 'utf8');
await writeFile(card, await prerenderCard(cardHtml, { root: process.cwd() }));

console.log('[place-home] old landing -> dist/legacy.html, new page -> dist/index.html');
console.log('[place-home] copy written into dist/index.html and dist/card/index.html');
