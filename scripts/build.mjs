import { cp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prerender, prerenderCard } from './prerender.mjs';

/**
 * Assemble the site.
 *
 * There is no application to compile here any more. The three React targets
 * (the page, the card, the lab) are built in hero-lab/ and their output is
 * committed under public/, so this project's whole job is to lay those out the
 * way the site serves them and write the copy into the HTML.
 *
 * It used to be a Vite build of its own, because the old landing page lived in
 * src/. That page was retired to /legacy, kept building on every deploy, and
 * was reachable only by typing the URL. Removing it took the React toolchain
 * with it: no Vite, no Tailwind, no second copy of React.
 *
 * `/` is the page. Vercel matches the filesystem before it applies rewrites,
 * so a rewrite could never put the page at the root: the file has to be there.
 * That is why new-home's HTML is copied rather than pointed at.
 */

const root = process.cwd();
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, 'public'), dist, { recursive: true });

const index = resolve(dist, 'index.html');
await cp(resolve(dist, 'new-home/index.html'), index);

await writeFile(index, await prerender(await readFile(index, 'utf8'), { root, dist }));

/* the card is the site's other public URL, and it ships from the same shared
   index.html, so it arrives carrying the page's title until this fixes it */
const card = resolve(dist, 'card/index.html');
await writeFile(card, await prerenderCard(await readFile(card, 'utf8'), { root }));

console.log('[build] public/ -> dist/, new-home -> dist/index.html');
console.log('[build] copy written into dist/index.html and dist/card/index.html');
