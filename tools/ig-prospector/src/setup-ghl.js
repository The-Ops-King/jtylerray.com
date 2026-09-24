/**
 * One-time GHL setup: create the contact custom fields (idempotent: existing fields are reused, matched by name),
 * look up the pipeline + stage named in config/ghl.json if it exists, and cache the id map to config/ghl-fields.json.
 * A missing pipeline is NOT an error: contacts can be pushed without one (`npm run export -- --ghl` needs
 * --opportunities to touch a pipeline at all).
 * Usage: node src/setup-ghl.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { readConfig, CONFIG_DIR } from './lib/paths.js';
import { GhlClient } from './lib/ghl.js';

const cfg = readConfig('ghl.json');
const ghl = new GhlClient();
const norm = (s) => String(s || '').trim().toLowerCase();

const existing = await ghl.listCustomFields();
console.log(`[ghl:setup] location ${ghl.locationId}: ${existing.length} existing contact custom fields`);
const fields = {};
for (const def of cfg.custom_fields) {
  let f = existing.find((x) => norm(x.name) === norm(def.name) || norm(x.fieldKey) === `contact.${def.key}`);
  if (f) { console.log(`  reuse   ${def.key} -> ${f.id} (${f.dataType})`); if (f.dataType !== def.dataType) console.warn(`  WARNING ${def.key} exists as ${f.dataType}, config wants ${def.dataType}`); }
  else { f = await ghl.createCustomField({ name: def.name, dataType: def.dataType }); console.log(`  created ${def.key} -> ${f?.id} (${def.dataType})`); }
  if (!f?.id) throw new Error(`Could not resolve custom field id for ${def.key}`);
  fields[def.key] = f.id;
}

const pipelines = await ghl.getPipelines();
const pipeline = pipelines.find((p) => norm(p.name) === norm(cfg.pipeline_name));
const out = { generated_at: new Date().toISOString(), locationId: ghl.locationId, fields };
if (pipeline) {
  const stages = (pipeline.stages || []).map((s) => ({ id: s.id, name: s.name, position: s.position }));
  const sourced = stages.find((s) => norm(s.name) === norm(cfg.sourced_stage_name));
  if (!sourced) throw new Error(`Pipeline "${pipeline.name}" has no "${cfg.sourced_stage_name}" stage. Stages: ${stages.map((s) => s.name).join(', ')}`);
  Object.assign(out, { pipelineId: pipeline.id, pipelineName: pipeline.name, sourcedStageId: sourced.id, sourcedStageName: sourced.name, stages });
  console.log(`[ghl:setup] pipeline "${pipeline.name}" (${pipeline.id}) stage "${sourced.name}" (${sourced.id})`);
} else {
  console.log(`[ghl:setup] no pipeline named "${cfg.pipeline_name}" in this location (found: ${pipelines.map((p) => p.name).join(', ') || 'none'}).`);
  console.log('[ghl:setup] that is fine: contacts push without a pipeline. To create opportunities, add that pipeline with a');
  console.log(`[ghl:setup] "${cfg.sourced_stage_name}" stage in GHL (Opportunities > Pipelines), rerun this, then export with --opportunities.`);
}
const file = path.join(CONFIG_DIR, 'ghl-fields.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`[ghl:setup] wrote ${file}`);
