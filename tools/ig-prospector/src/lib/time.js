/** All dates are handled in UTC. Today is computed once per process so a run that crosses midnight stays consistent. */
export const TODAY = new Date().toISOString().slice(0, 10);

/** Accepts unix seconds, unix milliseconds, ISO strings, or Date. Returns ms epoch or null. */
export function toEpochMs(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  if (typeof v === 'number') return v < 1e11 ? v * 1000 : v; // seconds vs ms
  if (typeof v === 'string') {
    if (/^\d{9,13}$/.test(v)) return toEpochMs(Number(v));
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export function daysBetween(fromMs, toMs = Date.now()) {
  if (fromMs == null) return null;
  return Math.max(0, Math.floor((toMs - fromMs) / 86400000));
}

export function isoDate(ms) {
  return ms == null ? null : new Date(ms).toISOString().slice(0, 10);
}
