import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CACHE_DIR } from './paths.js';

/**
 * Disk cache for every external response. Namespaces: apify-adlib, apify-ig, http, classify.
 * Keys that are not filesystem-safe (URLs, JSON) are hashed. Writes are atomic (tmp + rename).
 */
export function sha(input) {
  return crypto.createHash('sha256').update(typeof input === 'string' ? input : JSON.stringify(input)).digest('hex').slice(0, 32);
}

function fileFor(ns, key) {
  const safe = /^[a-z0-9._-]{1,80}$/i.test(key) ? key : sha(key);
  return path.join(CACHE_DIR, ns, `${safe}.json`);
}

export function cacheGet(ns, key) {
  const f = fileFor(ns, key);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch { return null; }
}

export function cacheSet(ns, key, value) {
  const f = fileFor(ns, key);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = `${f}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify({ cached_at: new Date().toISOString(), key, value }), 'utf8');
  fs.renameSync(tmp, f);
  return value;
}

export function cacheHas(ns, key) {
  return fs.existsSync(fileFor(ns, key));
}
