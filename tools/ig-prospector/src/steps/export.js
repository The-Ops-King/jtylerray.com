/**
 * Step 7: export. Write data/export.csv (exact column contract) and upsert qualified records into GHL.
 * GHL: upsert the contact keyed on the placeholder email (the key is derived from ig_handle, so it never changes and a
 * rerun can never duplicate), append the ig-* tags, and write every field including the real contact_email as a custom
 * field. Opportunities are OFF by default: pass --opportunities to also create one in the configured pipeline's Sourced
 * stage, and only when the contact has none there yet (an existing opportunity in any stage is never moved backward).
 * data/ghl-sync.ndjson records every synced handle; rerun skips them unless --force.
 * --retag revisits contacts that are already synced and only re-applies their tags (append-only, so it is safe to
 * repeat): use it after editing the segments in config/ghl.json, instead of re-pushing every field with --force.
 * Usage: node src/steps/export.js [--ghl] [--opportunities] [--retag] [--force] [--limit N]   (CSV only unless --ghl)
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, FILES, CONFIG_DIR } from '../lib/paths.js';
import { readNdjson, readNdjsonMap, appendNdjson, removeFromNdjson } from '../lib/ndjson.js';
import { GhlClient } from '../lib/ghl.js';
import { createLimiter } from '../lib/limiter.js';
import { createProgress } from '../lib/log.js';
import { toRecord, toCsv, tagSafe, segmentTags } from '../lib/export-format.js';

const args = parseArgs();
ensureDirs();
const ghlCfg = readConfig('ghl.json');

const qualified = readNdjson(FILES.qualified);
const records = qualified.map((r) => toRecord(r, ghlCfg.placeholder_email_domain));
fs.writeFileSync(FILES.exportCsv, toCsv(records), 'utf8');
console.log(`[export] wrote ${records.length} rows -> ${FILES.exportCsv}`);

if (!args.ghl) { console.log('[export] CSV only. Pass --ghl to upsert into GoHighLevel.'); process.exit(0); }

const fieldMapFile = path.join(CONFIG_DIR, 'ghl-fields.json');
if (!fs.existsSync(fieldMapFile)) throw new Error(`Missing ${fieldMapFile}. Run \`npm run ghl:setup\` first.`);
const fieldMap = JSON.parse(fs.readFileSync(fieldMapFile, 'utf8'));
if (args.opportunities && !fieldMap.pipelineId) throw new Error(`--opportunities needs a pipeline: no "${ghlCfg.pipeline_name}" pipeline was found when \`npm run ghl:setup\` last ran. Create it in GHL with a "${ghlCfg.sourced_stage_name}" stage, rerun ghl:setup, then retry.`);
const ghl = new GhlClient();
if (fieldMap.locationId !== ghl.locationId) throw new Error(`config/ghl-fields.json was generated for location ${fieldMap.locationId}, but GHL_LOCATION_ID is ${ghl.locationId}. Rerun \`npm run ghl:setup\`.`);

const synced = readNdjsonMap(FILES.ghlSync);
const pending = records.filter((rec) => args.force || args.retag || !synced.has(rec.ig_handle)).slice(0, args.limit);
if (args.force) removeFromNdjson(FILES.ghlSync, new Set(pending.map((r) => r.ig_handle)));
const progress = createProgress('export:ghl', pending.length);
const limit = createLimiter(3);

const p = ghlCfg.tag_prefix || 'ig';
const tagsFor = (rec) => [`${p}-prospect`, `${p}-src-${tagSafe(rec.source)}`, `${p}-tier-${tagSafe(rec.fit_tier)}`, `${p}-niche-${tagSafe(rec.niche)}`, ...segmentTags(rec, ghlCfg.segments, p)];

await Promise.all(pending.map((rec) => limit(async () => {
  try {
    // --retag on an already-synced contact: tags only, no upsert and no opportunity work.
    const prior = synced.get(rec.ig_handle);
    if (args.retag && !args.force && prior?.contact_id) {
      const tags = tagsFor(rec);
      await ghl.addTags(prior.contact_id, tags);
      const result = { ...prior, tags, retagged_at: new Date().toISOString() };
      synced.set(rec.ig_handle, result);
      appendNdjson(FILES.ghlSync, result);
      progress.tick(`@${rec.ig_handle} retagged ${tags.join(' ')}`);
      return;
    }
    const customFields = Object.entries(fieldMap.fields)
      .filter(([key]) => rec[key] !== '' && rec[key] != null)
      .map(([key, id]) => ({ id, field_value: rec[key] }));
    const up = await ghl.upsertContact({
      email: rec.email,
      firstName: rec.first_name || undefined,
      lastName: rec.last_name || undefined,
      // No owner name was found for ~1 in 5 rows. Fall back to "@handle" rather than the bare handle, so the CRM
      // shows something recognisable as an Instagram account instead of a word posing as someone's first name.
      name: [rec.first_name, rec.last_name].filter(Boolean).join(' ') || `@${rec.ig_handle}`,
      website: rec.ig_url,
      source: `ig-prospector:${rec.source}`,
      customFields,
    });
    const contactId = up?.contact?.id;
    if (!contactId) throw new Error(`upsert returned no contact id: ${JSON.stringify(up).slice(0, 200)}`);
    const tags = tagsFor(rec);
    await ghl.addTags(contactId, tags);

    let opportunity = null; let oppAction = 'skipped (contacts only; pass --opportunities)';
    if (args.opportunities) {
    const existingOpps = await ghl.findOpportunities(contactId, fieldMap.pipelineId);
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
