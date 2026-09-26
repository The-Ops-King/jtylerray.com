/**
 * Daily Instagram warm-up run. Reads its whole state from GoHighLevel (opportunities in the warm-up pipeline plus one
 * task per prospect), so it needs nothing from this machine and keeps working from any fresh checkout.
 *
 * Each run: advance anyone whose task you ticked, re-raise anyone stalled without a task, top the day up to the touch
 * cap with the best untouched prospects from the source tag, then write the digest to data/warmup-digest.md.
 * Nothing advances on its own; ticking the task in GHL is the signal.
 *
 * Writes data/warmup-digest.md and data/warmup-digest.html; the HTML one is what gets emailed.
 * Usage: node src/steps/warmup.js [--dry-run] [--cap N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/cli.js';
import { ensureDirs, readConfig, DATA_DIR } from '../lib/paths.js';
import { GhlClient } from '../lib/ghl.js';
import { createLimiter } from '../lib/limiter.js';
import { loadWarmupConfig, planDay, renderDigest, renderDigestHtml, taskTitle, todayIn, dueAt } from '../lib/warmup.js';

const args = parseArgs();
ensureDirs();
const cfg = loadWarmupConfig();
if (args.cap) cfg.daily_touch_cap = Number(args.cap);
const ghl = new GhlClient();
const dry = Boolean(args.dryRun);
const today = todayIn(cfg.timezone);
const say = (...m) => console.log('[warmup]', ...m);
if (dry) say('DRY RUN: nothing will be written to GoHighLevel');

// 1) Pipeline and stage ids, resolved by name so no local cache can go stale.
const pipeline = (await ghl.getPipelines()).find((p) => p.name.trim().toLowerCase() === cfg.pipeline_name.trim().toLowerCase());
if (!pipeline) throw new Error(`No "${cfg.pipeline_name}" pipeline in location ${ghl.locationId}.`);
const stageIdByName = new Map((pipeline.stages || []).map((s) => [s.name.trim().toLowerCase(), s.id]));
const stageIds = cfg.stages.map((s) => {
  const id = stageIdByName.get(s.ghl_stage.trim().toLowerCase());
  if (!id) throw new Error(`Pipeline "${pipeline.name}" has no stage "${s.ghl_stage}". Stages: ${(pipeline.stages || []).map((x) => x.name).join(', ')}`);
  return id;
});
const terminalIds = new Set([cfg.replied_stage_name, cfg.dead_stage_name].map((n) => stageIdByName.get(n.trim().toLowerCase())).filter(Boolean));
const stageIndexById = new Map(stageIds.map((id, i) => [id, i]));

// 2) Who is already in the pipeline, and which of them are still in flight.
const opps = await ghl.listPipelineOpportunities(pipeline.id);
const contactIdOf = (o) => o.contactId || o.contact?.id || null;
const enrolled = new Set(opps.map(contactIdOf).filter(Boolean));
const inflightOpps = opps.filter((o) => !terminalIds.has(o.pipelineStageId) && stageIndexById.has(o.pipelineStageId));
say(`pipeline "${pipeline.name}": ${opps.length} enrolled, ${inflightOpps.length} in flight, ${opps.length - inflightOpps.length} finished or parked`);

// 3) Pull each in-flight prospect's fields and tasks.
const fieldIds = JSON.parse(fs.readFileSync(path.join(DATA_DIR, '..', 'config', 'ghl-fields.json'), 'utf8')).fields;
const nameByFieldId = Object.fromEntries(Object.entries(fieldIds).map(([k, v]) => [v, k]));
const readFields = (contact) => {
  const out = {};
  for (const f of contact?.customFields || []) { const k = nameByFieldId[f.id]; if (k) out[k] = f.value ?? f.fieldValue ?? ''; }
  return out;
};
const limit = createLimiter(3);
const inflight = (await Promise.all(inflightOpps.map((o) => limit(async () => {
  const contactId = contactIdOf(o);
  if (!contactId) return null;
  const [c, tasks] = await Promise.all([
    ghl.request('GET', `/contacts/${contactId}`).then((r) => r?.contact || {}),
    ghl.listTasks(contactId),
  ]);
  const f = readFields(c);
  return { ig_handle: f.ig_handle || String(c.firstName || '').replace(/^@/, ''), contact_id: contactId, opportunity_id: o.id, stage_index: stageIndexById.get(o.pipelineStageId), tasks, ...f };
}))))
  .filter(Boolean);

// 4) Decide.
const plan = planDay(cfg, inflight, today);
say(`today ${today}: ${plan.due.length} due, ${plan.advance.length} to advance, ${plan.deferred.length} pushed past the cap, ${plan.awaiting.length} awaiting a reply, ${plan.scheduled.length} scheduled, room for ${plan.capacity} new`);

// 5) Advance whatever was ticked. The card moves today; the task for its new stage is written in step 6, with the date
// the plan settled on (which the touch cap may have pushed past today).
for (const p of plan.advance) {
  const s = cfg.stages[p.stage_index];
  if (!dry) await ghl.moveOpportunity(p.opportunity_id, pipeline.id, stageIds[p.stage_index]);
  say(`  advanced @${p.ig_handle} to ${s.label}, next touch ${p.next_due_date}`);
}

// 6) Every task the plan asked for: the new stage's task after an advance, a replacement for a prospect stalled without
// one, and a later date for whatever the cap pushed out of today.
for (const w of plan.taskWrites) {
  const s = cfg.stages[w.stage_index];
  const title = taskTitle(cfg, w.stage_index, w.ig_handle);
  const body = `${s.action}\n\n${s.detail}\n\nhttps://www.instagram.com/${w.ig_handle}/`;
  const dueDate = dueAt(cfg, w.due_date);
  if (!dry) {
    if (w.mode === 'reschedule') await ghl.updateTask(w.contact_id, w.task_id, { title, body, dueDate });
    else await ghl.createTask(w.contact_id, { title, body, dueDate });
  }
  say(`  ${w.mode === 'reschedule' ? 'pushed' : 'task set for'} @${w.ig_handle} at ${s.label} -> ${w.due_date}`);
}

// 7) Top the day up with the strongest prospects not yet enrolled. The pool size is read every day, cheaply, so the
// digest can always state the runway rather than only on days it happens to pull someone in.
const entered = [];
let poolLeft = null;
try { poolLeft = Math.max(0, (await ghl.countByTag(cfg.source_tag)) - enrolled.size); }
catch (err) { say(`could not count the ${cfg.source_tag} pool: ${err.message}`); }
if (plan.capacity > 0) {
  const pool = await ghl.searchByTag(cfg.source_tag);
  const candidates = pool
    .map((c) => ({ contact: c, f: readFields(c) }))
    .filter(({ contact }) => !enrolled.has(contact.id))
    .map(({ contact, f }) => ({ contact_id: contact.id, ...f, fit_score: Number(f.fit_score) || 0 }))
    .sort((a, b) => b.fit_score - a.fit_score || String(a.ig_handle).localeCompare(String(b.ig_handle)));
  poolLeft = Math.max(0, candidates.length - plan.capacity);
  const s = cfg.stages[0];
  for (const c of candidates.slice(0, plan.capacity)) {
    if (!c.ig_handle) continue;
    if (!dry) {
      const o = await ghl.createOpportunity({ pipelineId: pipeline.id, pipelineStageId: stageIds[0], contactId: c.contact_id, name: `@${c.ig_handle}` });
      await ghl.createTask(c.contact_id, { title: taskTitle(cfg, 0, c.ig_handle), body: `${s.action}\n\n${s.detail}\n\nhttps://www.instagram.com/${c.ig_handle}/`, dueDate: dueAt(cfg, today) });
      if (!o?.id) say(`  WARNING: no opportunity id returned for @${c.ig_handle}`);
    }
    entered.push({ ...c, stage_index: 0, is_new: true });
    say(`  entered @${c.ig_handle} (score ${c.fit_score}) at ${s.label}`);
  }
  say(`${cfg.source_tag} pool: ${candidates.length} untouched, ${entered.length} pulled in, ${poolLeft} left`);
} else if (poolLeft != null) {
  say(`${cfg.source_tag} pool: ${poolLeft} untouched, none pulled in (today is already full)`);
}

// 8) The digest.
const view = {
  today, due: plan.due, entered, advance: plan.advance, deferred: plan.deferred, awaiting: plan.awaiting, scheduled: plan.scheduled,
  rosterTotal: inflight.length + entered.length, poolLeft,
};
const digest = renderDigest(cfg, view);
const out = path.join(DATA_DIR, 'warmup-digest.md');
fs.writeFileSync(out, digest + '\n');
fs.writeFileSync(path.join(DATA_DIR, 'warmup-digest.html'), renderDigestHtml(cfg, view) + '\n');
say(`digest -> ${out} (and .html for email)`);
console.log('\n' + digest);
