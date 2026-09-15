import { ApifyClient } from 'apify-client';
import { requireEnv } from './env.js';
import { withBackoff } from './limiter.js';

let client;
export function apify() {
  if (!client) {
    const { APIFY_TOKEN } = requireEnv('APIFY_TOKEN');
    client = new ApifyClient({ token: APIFY_TOKEN });
  }
  return client;
}

/**
 * Run an actor to completion and return { items, run }.
 * maxTotalChargeUsd and maxItems are hard caps enforced by Apify so a bad input cannot run away.
 * Caller is responsible for caching; this function always spends.
 */
export async function runActor(actorId, input, { timeoutSecs = 600, maxTotalChargeUsd, maxItems, label = actorId } = {}) {
  const run = await withBackoff(
    () => apify().actor(actorId).call(input, { waitSecs: timeoutSecs, timeout: timeoutSecs, maxTotalChargeUsd, maxItems, log: null }),
    { label: `apify:${label}` },
  );
  if (run.status !== 'SUCCEEDED') {
    throw new Error(`Apify run ${run.id} for ${actorId} ended with status ${run.status}${run.statusMessage ? `: ${run.statusMessage}` : ''}`);
  }
  const items = [];
  for await (const item of apify().dataset(run.defaultDatasetId).listItems({ clean: true })) items.push(item);
  return {
    items,
    run: { id: run.id, actorId, status: run.status, usageTotalUsd: run.usageTotalUsd ?? 0, startedAt: run.startedAt, finishedAt: run.finishedAt, datasetId: run.defaultDatasetId, itemCount: items.length },
  };
}
