/**
 * Seed sources: any step that finds Instagram handles some other way than the Ad Library (Skool owners, Instagram
 * search, related profiles) writes a file under data/raw/seeds/<source>/ and resolve.js folds it in with source=<source>.
 * File shape: { source_detail, written_at, items: [{ ig_handle, name?, page_id?, funnel_url?, extra? }] }.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RAW_DIR } from './paths.js';
import { sha } from './cache.js';

export const SEEDS_DIR = path.join(RAW_DIR, 'seeds');

/** Writes one file per distinct item set (hash in the name), so reruns never overwrite an earlier sample. Returns the path. */
export function writeSeedFile(source, slug, source_detail, items) {
  const dir = path.join(SEEDS_DIR, source);
  fs.mkdirSync(dir, { recursive: true });
  const clean = items.filter((i) => i && i.ig_handle).map((i) => ({ ig_handle: i.ig_handle, name: i.name ?? null, page_id: i.page_id ?? null, funnel_url: i.funnel_url ?? null, extra: i.extra ?? {} }));
  const key = sha(clean.map((i) => i.ig_handle).sort().join('\n') + JSON.stringify(clean)).slice(0, 8);
  const file = path.join(dir, `${slug}-${key}.json`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ source, source_detail, written_at: new Date().toISOString(), items: clean }, null, 2));
  return file;
}

/** Every seed item on disk, tagged with its source (the directory name) and source_detail. */
export function loadSeeds() {
  const out = [];
  if (!fs.existsSync(SEEDS_DIR)) return out;
  for (const source of fs.readdirSync(SEEDS_DIR)) {
    const dir = path.join(SEEDS_DIR, source);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const item of p.items || []) out.push({ item, source, source_detail: p.source_detail || f.replace(/\.json$/, '') });
    }
  }
  return out;
}

/** All handles the pipeline already knows about, so a seed source can skip them before spending anything. */
export function knownHandles(...ndjsonMaps) {
  const s = new Set();
  for (const m of ndjsonMaps) for (const h of m.keys()) s.add(h);
  for (const { item } of loadSeeds()) s.add(String(item.ig_handle).toLowerCase());
  return s;
}
