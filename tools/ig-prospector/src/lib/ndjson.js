import fs from 'node:fs';
import path from 'node:path';

/** JSON.stringify leaves U+2028/U+2029 raw; some line-splitters treat them as newlines. Escape so one record is always one line. */
const serialize = (row) => JSON.stringify(row).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/**
 * Read an NDJSON file into an array. Missing file -> [].
 * A line that does not parse is a write that was interrupted (process killed mid-append): it is skipped with a
 * warning, and because its record is then absent from the map the step re-processes it. Nothing is lost.
 */
export function readNdjson(file) {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const rows = [];
  let corrupt = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { corrupt++; }
  }
  if (corrupt) console.warn(`[ndjson] ${path.basename(file)}: skipped ${corrupt} corrupt line(s) from an interrupted write; those records will be re-processed`);
  return rows;
}

/** Read into a Map keyed by `key`. Later rows win, so an appended update supersedes an earlier row. */
export function readNdjsonMap(file, key = 'ig_handle') {
  const m = new Map();
  for (const row of readNdjson(file)) if (row[key] != null) m.set(row[key], row);
  return m;
}

/** Append one row. Synchronous so a kill right after the call cannot lose the row. */
export function appendNdjson(file, row) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // If the previous append was cut off before its newline, start on a fresh line so the torn line stays isolated.
  let prefix = '';
  try {
    const st = fs.statSync(file);
    if (st.size > 0) { const fd = fs.openSync(file, 'r'); const b = Buffer.alloc(1); fs.readSync(fd, b, 0, 1, st.size - 1); fs.closeSync(fd); if (b[0] !== 0x0a) prefix = '\n'; }
  } catch { /* file does not exist yet */ }
  fs.appendFileSync(file, prefix + serialize(row) + '\n', 'utf8');
}

/** Atomically rewrite a whole file (tmp + rename). */
export function writeNdjson(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, rows.map(serialize).join('\n') + (rows.length ? '\n' : ''), 'utf8');
  fs.renameSync(tmp, file);
}

/** Drop rows for handles in `handles` (used by --force on a subset). */
export function removeFromNdjson(file, handles, key = 'ig_handle') {
  const keep = readNdjson(file).filter((r) => !handles.has(r[key]));
  writeNdjson(file, keep);
}

/** Drop rows whose key is no longer present upstream (e.g. a handle removed by a resolve rerun). Returns how many were dropped. */
export function pruneOrphans(file, upstreamKeys, key = 'ig_handle') {
  const rows = readNdjson(file);
  const keep = rows.filter((r) => upstreamKeys.has(r[key]));
  if (keep.length !== rows.length) { writeNdjson(file, keep); console.log(`[ndjson] ${path.basename(file)}: pruned ${rows.length - keep.length} row(s) no longer present upstream`); }
  return rows.length - keep.length;
}

/** Rewrite an append-only file keeping only the latest row per key (later rows win). Run at the end of a step. */
export function compactNdjson(file, key = 'ig_handle') {
  const rows = readNdjson(file);
  const m = new Map();
  for (const r of rows) if (r[key] != null) m.set(r[key], r);
  if (m.size !== rows.length) writeNdjson(file, [...m.values()]);
  return rows.length - m.size;
}
