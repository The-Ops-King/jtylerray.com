import { appendNdjson } from './ndjson.js';
import { FILES } from './paths.js';

/**
 * Running counters so a runaway loop is visible on the terminal, not on the invoice.
 * Every external spend is also appended to data/costs.ndjson.
 */
export function createProgress(step, total) {
  const state = { step, total, processed: 0, skipped: 0, failed: 0, usd: 0, units: 0, startedAt: Date.now() };
  const print = (note = '') => {
    const secs = Math.round((Date.now() - state.startedAt) / 1000);
    process.stdout.write(`[${step}] processed ${state.processed}/${state.total} | skipped(cached) ${state.skipped} | failed ${state.failed} | spend $${state.usd.toFixed(4)} (${state.units} units) | ${secs}s ${note}\n`);
  };
  return {
    state,
    tick(note) { state.processed++; print(note); },
    skip() { state.skipped++; },
    fail(note) { state.failed++; print(note); },
    spend({ provider, units = 0, usd = 0, detail }) {
      state.usd += usd; state.units += units;
      appendNdjson(FILES.costs, { ts: new Date().toISOString(), step, provider, units, usd: Number(usd.toFixed(6)), detail });
    },
    done() { print('DONE'); },
  };
}
