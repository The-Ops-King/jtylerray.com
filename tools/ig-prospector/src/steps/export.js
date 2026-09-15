/**
 * Step 7: export. Write data/export.csv (exact column contract) and upsert qualified records into GHL.
 * GHL: upsert contact keyed on the placeholder email, append tags source-{source} and niche-{niche},
 * create an opportunity in the IG Outreach pipeline / Sourced stage ONLY if the contact has no opportunity in that
 * pipeline yet. An existing opportunity in any stage is left untouched (never move backward).
 * data/ghl-sync.ndjson records every synced handle; rerun skips them unless --force.
 * Usage: node src/steps/export.js [--dry-run | --no-ghl] [--force] [--limit N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, FILES, CONFIG_DIR } from '../lib/paths.js';
import { readNdjson, readNdjsonMap, appendNdjson, removeFromNdjson } from '../lib/ndjson.js';
import { GhlClient } from '../lib/ghl.js';
import { createLimiter } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';
import { toRecord, toCsv, tagSafe } from '../lib/export-format.js';

const args = parseArgs();
ensureDirs();
const ghlCfg = readConfig('ghl.json');

const qualified = readNdjson(FILES.qualified);
const records = qualified.map((r) => toRecord(r, ghlCfg.placeholder_email_domain));
fs.writeFileSync(FILES.exportCsv, toCsv(records), 'utf8');
console.log(`[export] wrote ${records.length} rows -> ${FILES.exportCsv}`);

if (args.dryRun || args.noGhl) { console.log('[export] GHL sync skipped (--dry-run / --no-ghl)'); process.exit(0); }

const fieldMapFile = path.join(CONFIG_DIR, 'ghl-fields.json');
if (!fs.existsSync(fieldMapFile)) throw new Error(`Missing ${fieldMapFile}. Run \`npm run ghl:setup\` first.`);
const fieldMap = JSON.parse(fs.readFileSync(fieldMapFile, 'utf8'));
const ghl = new GhlClient();
if (fieldMap.locationId !== ghl.locationId) throw new Error(`config/ghl-fields.json was generated for location ${fieldMap.locationId}, but GHL_LOCATION_ID is ${ghl.locationId}. Rerun \`npm run ghl:setup\`.`);

const synced = readNdjsonMap(FILES.ghlSync);
const pending = records.filter((rec) => args.force || !synced.has(rec.ig_handle)).slice(0, args.limit);
if (args.force) removeFromNdjson(FILES.ghlSync, new Set(pending.map((r) => r.ig_handle)));
const progress = createProgress('export:ghl', pending.length);
const limit = createLimiter(3);

await Promise.all(pending.map((rec) => limit(async () => {
  try {
    const customFields = Object.entries(fieldMap.fields)
      .filter(([key]) => rec[key] !== '' && rec[key] != null)
      .map(([key, id]) => ({ id, field_value: rec[key] }));
    const up = await ghl.upsertContact({
      email: rec.email,
      firstName: rec.first_name || undefined,
      lastName: rec.last_name || undefined,
      name: [rec.first_name, rec.last_name].filter(Boolean).join(' ') || rec.ig_handle,
      website: rec.ig_url,
      source: `ig-prospector:${rec.source}`,
      customFields,
    });
    const contactId = up?.contact?.id;
    if (!contactId) throw new Error(`upsert returned no contact id: ${JSON.stringify(up).slice(0, 200)}`);
    const tags = [`source-${tagSafe(rec.source)}`, `niche-${tagSafe(rec.niche)}`];
    await ghl.addTags(contactId, tags);

    const existingOpps = await ghl.findOpportunities(contactId, fieldMap.pipelineId);
    let opportunity = null; let oppAction;
    if (existingOpps.length) {
      const o = existingOpps[0];
      const stage = fieldMap.stages.find((s) => s.id === o.pipelineStageId);
      oppAction = `kept existing opportunity in stage "${stage?.name ?? o.pipelineStageId}"`;
      opportunity = { id: o.id, stageId: o.pipelineStageId, stageName: stage?.name ?? null };
    } else {
      const o = await ghl.createOpportunity({ pipelineId: fieldMap.pipelineId, pipelineStageId: fieldMap.sourcedStageId, contactId, name: `@${rec.ig_handle}` });
      oppAction = 'created opportunity in Sourced';
      opportunity = { id: o?.id ?? null, stageId: fieldMap.sourcedStageId, stageName: fieldMap.sourcedStageName };
    }
    const result = { ig_handle: rec.ig_handle, contact_id: contactId, contact_new: Boolean(up?.new), tags, opportunity, opp_action: oppAction, synced_at: new Date().toISOString() };
    synced.set(rec.ig_handle, result);
    appendNdjson(FILES.ghlSync, result);
    progress.tick(`@${rec.ig_handle} contact=${contactId} (${up?.new ? 'new' : 'updated'}) ${oppAction}`);
  } catch (err) {
    progress.fail(`@${rec.ig_handle} ${err.message}`);
  }
})));
progress.done();
if (progress.state.failed) process.exitCode = 1;
