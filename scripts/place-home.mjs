import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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
 */

const dist = resolve(process.cwd(), 'dist');
const legacy = resolve(dist, 'legacy.html');
const root = resolve(dist, 'index.html');
const page = resolve(dist, 'new-home/index.html');

await copyFile(root, legacy);
await copyFile(page, root);

console.log('[place-home] old landing -> dist/legacy.html, new page -> dist/index.html');
