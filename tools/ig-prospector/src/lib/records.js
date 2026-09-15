import { FILES } from './paths.js';
import { readNdjsonMap } from './ndjson.js';

/**
 * Each step file stores only ig_handle plus that step's own fields. This joins them by handle so a downstream step
 * always sees the CURRENT upstream values (a resolve rerun that changes funnel_url is visible to enrich-funnel and
 * classify without any file rewrite). `stages` lists the files to join, in pipeline order; missing stages are skipped.
 */
export function loadJoined(stages = ['resolved', 'profiles', 'funnels', 'classified']) {
  const maps = stages.map((s) => readNdjsonMap(FILES[s]));
  const base = maps[0];
  const out = new Map();
  for (const [handle, row] of base) {
    let merged = { ...row };
    for (let i = 1; i < maps.length; i++) { const r = maps[i].get(handle); if (r) merged = { ...merged, ...r }; }
    out.set(handle, merged);
  }
  return out;
}

/** Keep only the step's own fields (everything not already in the upstream row) plus the key. */
export function ownFields(upstreamRow, fullRow, key = 'ig_handle') {
  const own = { [key]: fullRow[key] };
  for (const [k, v] of Object.entries(fullRow)) if (!(k in upstreamRow) || upstreamRow[k] !== v) own[k] = v;
  return own;
}
