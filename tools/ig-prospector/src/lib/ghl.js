import { requireEnv } from './env.js';
import { withBackoff } from './limiter.js';
import { readConfig } from './paths.js';

/**
 * GoHighLevel API v2 client (verified against GoHighLevel/highlevel-api-docs OpenAPI, Sept 2026):
 *   base https://services.leadconnectorhq.com, header Version: 2021-07-28, bearer = Private Integration token.
 *   POST /contacts/upsert            body { locationId, email, firstName, lastName, source, customFields:[{id, field_value}] } -> { new, contact }
 *       NOTE: `tags` on upsert OVERWRITES all tags, so tags are added via POST /contacts/{id}/tags (append).
 *   GET  /locations/{id}/customFields?model=contact  -> { customFields:[{id,name,fieldKey,dataType}] }
 *   POST /locations/{id}/customFields  body { name, dataType, model:'contact' } -> { customField }
 *   GET  /opportunities/pipelines?locationId=        -> { pipelines:[{id,name,stages:[{id,name,position}]}] }
 *   GET  /opportunities/search?location_id=&contact_id=&pipeline_id=&limit= -> { opportunities:[{id,pipelineId,pipelineStageId,status}] }
 *   POST /opportunities/  body { pipelineId, locationId, name, status:'open', contactId, pipelineStageId } -> { opportunity }
 */
export class GhlClient {
  constructor() {
    const cfg = readConfig('ghl.json');
    const { GHL_PRIVATE_TOKEN, GHL_LOCATION_ID } = requireEnv('GHL_PRIVATE_TOKEN', 'GHL_LOCATION_ID');
    this.base = cfg.api_base.replace(/\/$/, '');
    this.version = cfg.api_version;
    this.token = GHL_PRIVATE_TOKEN;
    this.locationId = GHL_LOCATION_ID;
  }

  async request(method, path, { query, body } = {}) {
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(query || {})) if (v != null) url.searchParams.set(k, String(v));
    return withBackoff(async () => {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, Version: this.version, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
      if (!res.ok) {
        const err = new Error(`GHL ${method} ${path} -> ${res.status}: ${json?.message ? JSON.stringify(json.message) : text.slice(0, 300)}`);
        err.status = res.status; err.headers = Object.fromEntries(res.headers.entries()); err.body = json;
        throw err;
      }
      return json;
    }, { label: `ghl ${method} ${path}` });
  }

  listCustomFields() { return this.request('GET', `/locations/${this.locationId}/customFields`, { query: { model: 'contact' } }).then((r) => r?.customFields || []); }
  createCustomField({ name, dataType, placeholder }) { return this.request('POST', `/locations/${this.locationId}/customFields`, { body: { name, dataType, model: 'contact', ...(placeholder ? { placeholder } : {}) } }).then((r) => r?.customField); }
  getPipelines() { return this.request('GET', '/opportunities/pipelines', { query: { locationId: this.locationId } }).then((r) => r?.pipelines || []); }

  upsertContact(contact) { return this.request('POST', '/contacts/upsert', { body: { locationId: this.locationId, ...contact } }); }
  addTags(contactId, tags) { return this.request('POST', `/contacts/${contactId}/tags`, { body: { tags } }); }

  /** Every opportunity in a pipeline, paged. */
  async listPipelineOpportunities(pipelineId) {
    const out = []; let page = 1;
    for (;;) {
      const r = await this.request('GET', '/opportunities/search', { query: { location_id: this.locationId, pipeline_id: pipelineId, limit: 100, page } });
      const batch = r?.opportunities || [];
      out.push(...batch);
      if (batch.length < 100) break;
      page++;
      if (page > 50) break; // a pipeline this size means something is wrong upstream
    }
    return out;
  }

  moveOpportunity(opportunityId, pipelineId, pipelineStageId) {
    return this.request('PUT', `/opportunities/${opportunityId}`, { body: { pipelineId, pipelineStageId } });
  }

  listTasks(contactId) { return this.request('GET', `/contacts/${contactId}/tasks`).then((r) => r?.tasks || []); }
  createTask(contactId, { title, body, dueDate }) { return this.request('POST', `/contacts/${contactId}/tasks`, { body: { title, body, dueDate, completed: false } }).then((r) => r?.task || r); }
  /** Move an open task's due date (the touch cap pushes work to another day rather than piling it onto one). */
  updateTask(contactId, taskId, { title, body, dueDate }) { return this.request('PUT', `/contacts/${contactId}/tasks/${taskId}`, { body: { title, body, dueDate, completed: false } }).then((r) => r?.task || r); }

  /** How many contacts carry a tag, without paging through them. */
  countByTag(tag) {
    return this.request('POST', '/contacts/search', { body: { locationId: this.locationId, page: 1, pageLimit: 1, filters: [{ field: 'tags', operator: 'contains', value: tag }] } })
      .then((r) => r?.total ?? 0);
  }

  /** Contacts carrying a tag, paged. Returns full contact records including customFields. */
  async searchByTag(tag, { max = 2000 } = {}) {
    const out = []; let page = 1;
    for (;;) {
      const r = await this.request('POST', '/contacts/search', { body: { locationId: this.locationId, page, pageLimit: 100, filters: [{ field: 'tags', operator: 'contains', value: tag }] } });
      const batch = r?.contacts || [];
      out.push(...batch);
      if (batch.length < 100 || out.length >= max) break;
      page++;
    }
    return out;
  }

  async findOpportunities(contactId, pipelineId) {
    const r = await this.request('GET', '/opportunities/search', { query: { location_id: this.locationId, contact_id: contactId, pipeline_id: pipelineId, limit: 100 } });
    return r?.opportunities || [];
  }
  createOpportunity({ pipelineId, pipelineStageId, contactId, name }) {
    return this.request('POST', '/opportunities/', { body: { locationId: this.locationId, pipelineId, pipelineStageId, contactId, name, status: 'open' } }).then((r) => r?.opportunity);
  }
}
