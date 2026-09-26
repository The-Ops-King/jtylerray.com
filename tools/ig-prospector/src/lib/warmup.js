/**
 * Warm-up ladder: the pure decision layer. No network and no clock of its own, so the daily job's behaviour is
 * reproducible and testable. GoHighLevel holds all the state: an opportunity's stage is the prospect's stage, and one
 * open task per prospect is the thing you tick to advance it.
 */
import { z } from 'zod';
import { readConfig } from './paths.js';

const StageSchema = z.object({
  ghl_stage: z.string(),
  day: z.number().int().min(1),
  label: z.string(),
  action: z.string(),
  detail: z.string().default(''),
});

export const WarmupSchema = z.object({
  pipeline_name: z.string(),
  source_tag: z.string(),
  daily_touch_cap: z.number().int().min(1),
  timezone: z.string(),
  utc_offset_hours: z.number(),
  due_local_hour: z.number().int().min(0).max(23),
  task_prefix: z.string(),
  digest_email: z.string(),
  replied_stage_name: z.string(),
  dead_stage_name: z.string(),
  stages: z.array(StageSchema).min(2),
}).passthrough();

export function loadWarmupConfig() {
  const raw = readConfig('warmup.json');
  const cfg = WarmupSchema.parse(raw);
  const days = cfg.stages.map((s) => s.day);
  if (days.some((d, i) => i > 0 && d <= days[i - 1])) throw new Error(`warmup.json stage days must increase: got ${days.join(', ')}`);
  return cfg;
}

/** Days to wait after finishing stage i before stage i+1 is due. At the last stage there is no next. */
export const gapAfter = (cfg, i) => (i + 1 < cfg.stages.length ? cfg.stages[i + 1].day - cfg.stages[i].day : null);

/** Today as YYYY-MM-DD in the configured zone. Pass `now` to pin it in tests. */
export const todayIn = (tz, now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** Date-only arithmetic, anchored at midday so it cannot be dragged across a day boundary. */
export function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The instant a task due on `isoDate` should carry, so it lands at due_local_hour in the configured zone. */
export function dueAt(cfg, isoDate) {
  const utcHour = cfg.due_local_hour - cfg.utc_offset_hours;
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCHours(utcHour, 0, 0, 0);
  return d.toISOString();
}

export const taskTitle = (cfg, stageIndex, handle) => `[${cfg.task_prefix} ${stageIndex + 1}/${cfg.stages.length}] ${cfg.stages[stageIndex].label} @${handle}`;

/** The warm-up task for a prospect's current stage, newest first, ignoring tasks from other stages. */
export function taskForStage(cfg, tasks, stageIndex, handle) {
  const want = taskTitle(cfg, stageIndex, handle);
  return (tasks || []).filter((t) => t.title === want).sort((a, b) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')))[0] || null;
}

const dateOf = (v) => (v ? String(v).slice(0, 10) : null);
const maxDate = (a, b) => (a > b ? a : b);

/**
 * Work out today's actions from the in-flight prospects.
 *
 * `inflight` items: { ig_handle, contact_id, opportunity_id, stage_index, tasks: [{ id, title, dueDate, completed }] }
 * Returns:
 *   advance[]   - ticked their task, so the card moves to the next stage
 *   due[]       - a touch to do today, capped at daily_touch_cap
 *   deferred[]  - would have been due today but the cap was already full, so pushed a day out
 *   awaiting[]  - DM sent, sitting at the last stage until they reply
 *   scheduled[] - next touch is a future date, nothing to do
 *   capacity    - how many new prospects to pull in to reach daily_touch_cap
 *   taskWrites[]- every task to create or reschedule, with its final date, so the caller derives nothing
 */
export function planDay(cfg, inflight, today) {
  const last = cfg.stages.length - 1;
  const advance = []; const due = []; const awaiting = []; const scheduled = [];
  for (const p of inflight) {
    const i = p.stage_index;
    if (i == null || i < 0 || i > last) continue;
    const task = taskForStage(cfg, p.tasks, i, p.ig_handle);
    if (!task) {
      // No task for the stage the card sits in: the prospect is stalled, so make it actionable today.
      due.push({ ...p, stage_index: i, task: null, due_date: today, reason: 'task_missing' });
      continue;
    }
    if (task.completed) {
      if (i === last) { awaiting.push({ ...p, stage_index: i, task }); continue; }
      // Space the next touch from the day this one was DUE, not from the day this run noticed the tick. Spacing it from
      // the run day adds a day to every gap, because a tick is always seen a run late; over four stages that doubles
      // the ladder and lands the DM a week out instead of on day 5.
      const next = maxDate(addDays(dateOf(task.dueDate) || today, gapAfter(cfg, i)), today);
      const moved = { ...p, from_stage_index: i, stage_index: i + 1, task, next_due_date: next };
      advance.push(moved);
      // With a one-day gap the next touch is due the moment the card moves, so an advance is usually today's work too.
      if (next <= today) due.push({ ...moved, task: null, due_date: next, reason: 'advanced' });
      continue;
    }
    const d = dateOf(task.dueDate);
    if (!d || d <= today) due.push({ ...p, stage_index: i, task, due_date: d || today, reason: 'due' });
    else scheduled.push({ ...p, stage_index: i, task, due_date: d });
  }

  // The cap limits the day's work, not just intake. Once the stages of different cohorts collide the ladder can ask for
  // more touches than the cap on its own, and the excess has to move rather than pile onto one day: 30 comments in an
  // afternoon is how an Instagram account gets throttled. The furthest-along prospects keep their slot, because delaying
  // a DM wastes the warm-up that earned it.
  const deferred = [];
  if (due.length > cfg.daily_touch_cap) {
    due.sort((a, b) => b.stage_index - a.stage_index || (Number(b.fit_score) || 0) - (Number(a.fit_score) || 0) || String(a.ig_handle).localeCompare(String(b.ig_handle)));
    const tomorrow = addDays(today, 1);
    for (const p of due.splice(cfg.daily_touch_cap)) {
      deferred.push({ ...p, defer_to: tomorrow });
      // An advanced card still moves stage today; only its task moves out, so the advance carries the later date.
      if (p.reason === 'advanced') { const a = advance.find((x) => x.contact_id === p.contact_id); if (a) a.next_due_date = tomorrow; }
    }
  }

  const write = (p, due_date, mode, task_id) => ({ contact_id: p.contact_id, ig_handle: p.ig_handle, stage_index: p.stage_index, due_date, mode, task_id: task_id || null });
  const taskWrites = [
    ...advance.map((p) => write(p, p.next_due_date, 'create')),
    ...due.filter((p) => p.reason === 'task_missing').map((p) => write(p, today, 'create')),
    ...deferred.filter((p) => p.reason !== 'advanced').map((p) => write(p, p.defer_to, p.task ? 'reschedule' : 'create', p.task?.id)),
  ];

  const capacity = Math.max(0, cfg.daily_touch_cap - due.length);
  return { advance, due, deferred, awaiting, scheduled, capacity, taskWrites };
}

/** Today's people grouped by the stage they are due at, lowest stage first. */
function groupByStage(due, entered) {
  const byStage = new Map();
  for (const p of [...due, ...entered]) {
    const k = p.stage_index;
    if (!byStage.has(k)) byStage.set(k, []);
    byStage.get(k).push(p);
  }
  // Best prospect first within a stage, so the top of each list is where the attention should go.
  for (const people of byStage.values()) {
    people.sort((a, b) => (Number(b.fit_score) || 0) - (Number(a.fit_score) || 0) || String(a.ig_handle).localeCompare(String(b.ig_handle)));
  }
  return byStage;
}

const igLink = (p) => p.ig_url || `https://www.instagram.com/${p.ig_handle}/`;

/** The one-line facts under a name: only what helps you write a specific comment. */
function factsFor(p) {
  return [
    p.follower_count ? `${Number(p.follower_count).toLocaleString('en-US')} followers` : null,
    p.niche || null,
    p.funnel_type && p.funnel_type !== 'none' ? `${p.funnel_type} funnel` : null,
    p.fit_tier ? `tier ${p.fit_tier}` : null,
    p.is_new ? 'new today' : null,
  ].filter(Boolean);
}

/** The digest, as markdown. Deterministic: same plan and roster in, same text out. */
export function renderDigest(cfg, { today, due, entered, advance, deferred, awaiting, scheduled, rosterTotal, poolLeft }) {
  const byStage = groupByStage(due, entered);
  const lines = [`# Instagram warm-up, ${today}`, ''];
  const total = due.length + entered.length;
  lines.push(total ? `**${total} touches today.**` : '**Nothing due today.**');
  lines.push([`${rosterTotal} prospects in flight`, `${advance.length} advanced since yesterday`, `${awaiting.length} awaiting a reply after a DM`, poolLeft == null ? null : `${poolLeft} left in the pool`].filter(Boolean).join(', ') + '.');
  lines.push('');
  for (const i of [...byStage.keys()].sort((a, b) => a - b)) {
    const s = cfg.stages[i];
    const people = byStage.get(i);
    lines.push(`## ${s.label} — ${people.length} ${people.length === 1 ? 'person' : 'people'} (stage ${i + 1} of ${cfg.stages.length}, day ${s.day})`);
    lines.push(`${s.action}${s.detail ? ` ${s.detail}` : ''}`);
    lines.push('');
    for (const p of people) {
      lines.push(`- **@${p.ig_handle}** — ${igLink(p)}`);
      const facts = factsFor(p);
      if (facts.length) lines.push(`  ${facts.join(' · ')}`);
      if (p.funnel_url) lines.push(`  Their offer: ${p.funnel_url}`);
      if (i === cfg.stages.length - 1 && p.notes) lines.push(`  Context: ${String(p.notes).slice(0, 200)}`);
    }
    lines.push('');
  }
  if (awaiting.length) {
    lines.push(`## Awaiting a reply — ${awaiting.length}`);
    lines.push('DM sent. Move the card to Replied or Dead in GHL when you know.');
    lines.push('');
    for (const p of awaiting) lines.push(`- @${p.ig_handle} — https://www.instagram.com/${p.ig_handle}/`);
    lines.push('');
  }
  if (deferred?.length) lines.push(`_${deferred.length} more were ready today but would have taken the day past ${cfg.daily_touch_cap} touches, so they move to ${deferred[0].defer_to}._`);
  if (scheduled.length) {
    const next = scheduled.map((p) => p.due_date).sort()[0];
    lines.push(`_${scheduled.length} more scheduled, next on ${next}._`);
  }
  lines.push('');
  lines.push('_Tick each task in GoHighLevel as you finish it. That is what moves the prospect to the next stage; nothing advances on its own._');
  return lines.join('\n');
}

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The same digest as an email-ready HTML fragment. Inline styles only and no external assets, because every mail client
 * strips stylesheets. Handles are links so the day's work is one tap each on a phone.
 */
export function renderDigestHtml(cfg, { today, due, entered, advance, deferred, awaiting, scheduled, rosterTotal, poolLeft }) {
  const byStage = groupByStage(due, entered);
  const total = due.length + entered.length;
  const h = [];
  h.push('<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:640px">');
  h.push(`<h2 style="margin:0 0 4px;font-size:20px">Instagram warm-up &middot; ${esc(today)}</h2>`);
  h.push(`<p style="margin:0 0 2px;font-size:17px"><strong>${total ? `${total} touch${total === 1 ? '' : 'es'} today` : 'Nothing due today'}</strong></p>`);
  h.push(`<p style="margin:0 0 20px;color:#666;font-size:13px">${[`${rosterTotal} in flight`, `${advance.length} advanced since yesterday`, `${awaiting.length} awaiting a reply`, poolLeft == null ? null : `${poolLeft} left in the pool`].filter(Boolean).join(' &middot; ')}</p>`);
  for (const i of [...byStage.keys()].sort((a, b) => a - b)) {
    const s = cfg.stages[i];
    const people = byStage.get(i);
    h.push(`<h3 style="margin:22px 0 2px;font-size:16px">${esc(s.label)} &mdash; ${people.length} ${people.length === 1 ? 'person' : 'people'}</h3>`);
    h.push(`<p style="margin:0 0 12px;color:#444;font-size:13px">Stage ${i + 1} of ${cfg.stages.length}, day ${s.day}. ${esc(s.action)}${s.detail ? ` ${esc(s.detail)}` : ''}</p>`);
    h.push('<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">');
    for (const p of people) {
      const facts = factsFor(p);
      h.push('<tr><td style="padding:8px 0;border-top:1px solid #eee">');
      h.push(`<a href="${esc(igLink(p))}" style="font-weight:600;color:#0b5cd5;text-decoration:none">@${esc(p.ig_handle)}</a>`);
      if (facts.length) h.push(`<div style="color:#666;font-size:13px">${esc(facts.join(' · '))}</div>`);
      if (p.funnel_url) h.push(`<div style="font-size:13px">Their offer: <a href="${esc(p.funnel_url)}" style="color:#0b5cd5">${esc(String(p.funnel_url).replace(/^https?:\/\//, '').slice(0, 60))}</a></div>`);
      if (i === cfg.stages.length - 1 && p.notes) h.push(`<div style="color:#666;font-size:13px">${esc(String(p.notes).slice(0, 200))}</div>`);
      h.push('</td></tr>');
    }
    h.push('</table>');
  }
  if (awaiting.length) {
    h.push(`<h3 style="margin:22px 0 2px;font-size:16px">Awaiting a reply &mdash; ${awaiting.length}</h3>`);
    h.push('<p style="margin:0 0 8px;color:#444;font-size:13px">DM sent. Move the card to Replied or Dead in GoHighLevel when you know.</p>');
    h.push(`<p style="margin:0;font-size:13px">${awaiting.map((p) => `<a href="${esc(igLink(p))}" style="color:#0b5cd5;text-decoration:none">@${esc(p.ig_handle)}</a>`).join(' &middot; ')}</p>`);
  }
  if (deferred?.length) h.push(`<p style="margin:20px 0 0;color:#666;font-size:13px">${deferred.length} more were ready today but would have taken the day past ${cfg.daily_touch_cap} touches, so they move to ${esc(deferred[0].defer_to)}.</p>`);
  if (scheduled.length) {
    const next = scheduled.map((p) => p.due_date).sort()[0];
    h.push(`<p style="margin:20px 0 0;color:#666;font-size:13px">${scheduled.length} more scheduled, next on ${esc(next)}.</p>`);
  }
  h.push('<p style="margin:24px 0 0;padding-top:12px;border-top:1px solid #eee;color:#666;font-size:12px">Tick each task in GoHighLevel as you finish it. That is what moves the prospect to the next stage; nothing advances on its own.</p>');
  h.push('</div>');
  return h.join('\n');
}
