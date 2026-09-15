import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { z } from 'zod';
import { requireEnv } from './env.js';
import { withBackoff } from './limiter.js';

let client;
export function anthropic() {
  if (!client) { requireEnv('ANTHROPIC_API_KEY'); client = new Anthropic({ maxRetries: 2 }); }
  return client;
}

/** Classification contract. This is the ONLY LLM call in the pipeline: extraction, not judgment. */
export const CLASSIFICATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    owner_first_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    owner_last_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    niche: { type: 'string', enum: ['fitness', 'business', 'relationship', 'health', 'finance', 'other'] },
    funnel_type: { type: 'string', enum: ['booking', 'application', 'webinar', 'checkout', 'none'] },
    offer_price_usd: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    sells_to_coaches_about_getting_first_client: { type: 'boolean' },
    is_agency_or_systems_provider: { type: 'boolean' },
    team_signal: { type: 'string', enum: ['solo', 'has_setter', 'has_closer', 'hiring', 'unknown'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['owner_first_name', 'owner_last_name', 'niche', 'funnel_type', 'offer_price_usd', 'sells_to_coaches_about_getting_first_client', 'is_agency_or_systems_provider', 'team_signal', 'confidence'],
};

export const ClassificationSchema = z.object({
  owner_first_name: z.string().nullable(),
  owner_last_name: z.string().nullable(),
  niche: z.enum(['fitness', 'business', 'relationship', 'health', 'finance', 'other']),
  funnel_type: z.enum(['booking', 'application', 'webinar', 'checkout', 'none']),
  offer_price_usd: z.number().nullable(),
  sells_to_coaches_about_getting_first_client: z.boolean(),
  is_agency_or_systems_provider: z.boolean(),
  team_signal: z.enum(['solo', 'has_setter', 'has_closer', 'hiring', 'unknown']),
  confidence: z.enum(['high', 'medium', 'low']),
}).strict();

export const SYSTEM_PROMPT = `You extract structured facts about an online coach or consultant from their Instagram bio and the text of the landing page their ads or bio link to. You return only the JSON object described by the output schema.

Definitions:
- owner_first_name / owner_last_name: the human who owns the brand, taken from the bio, page, or handle. null if no person is named. Never invent a name from a business name.
- niche: fitness (body, training, nutrition), business (making money, sales, marketing, agencies, entrepreneurship), relationship (dating, marriage, family), health (medical, mental health, wellness, mindset without a money angle), finance (investing, trading, real estate, credit), other.
- funnel_type: what the primary call to action on the page asks the visitor to do. booking = schedule a call on a calendar. application = fill out a qualifying form / apply. webinar = register for a training, masterclass, workshop or challenge. checkout = buy directly with a price and payment. none = no clear CTA, page failed to load, or only social/newsletter links.
- offer_price_usd: the price of the main offer ONLY if a specific number is stated on the page or bio. Convert to USD only if the currency is explicit. If no price is stated, null. Never estimate or guess a price. Payment plans: use the total if stated, else null.
- sells_to_coaches_about_getting_first_client: true only if the offer teaches coaches/consultants/freelancers how to get their first clients, launch, or start an online business. False for offers aimed at established businesses or at non-coach consumers.
- is_agency_or_systems_provider: true if this is a marketing agency, ads agency, funnel/automation/CRM builder, software company, or any done-for-you service provider rather than a coach selling coaching.
- team_signal: has_setter if the page or bio mentions a setter, appointment setter or "my team will reach out"; has_closer if it mentions closers, sales reps or enrollment advisors; hiring if it advertises open roles; solo if the copy is clearly a single person doing everything; unknown otherwise.
- confidence: low whenever the page text is short, blocked, a login wall, an error page, or mostly navigation; medium when the page loaded but the offer is only implied; high when the bio and page clearly describe the offer, the CTA and the person.

Rules: null is a correct answer. Do not infer prices from words like "premium" or "high-ticket". Use only the text provided.`;

function usageCost(usage, price) {
  const mtok = (n) => (n || 0) / 1_000_000;
  return mtok(usage.input_tokens) * price.input + mtok(usage.output_tokens) * price.output + mtok(usage.cache_read_input_tokens) * price.cache_read + mtok(usage.cache_creation_input_tokens) * price.cache_write;
}

/**
 * Classify one prospect. Retries once on a parse/validation failure, then throws with the raw text attached.
 * Returns { classification, usage, usd, model, attempts }.
 */
export async function classifyProspect({ handle, bio, bioLink, funnelUrl, funnelText, followerCount }, cfg) {
  const user = [
    `INSTAGRAM HANDLE: @${handle}`,
    followerCount != null ? `FOLLOWERS: ${followerCount}` : null,
    `BIO:\n${bio || '(empty)'}`,
    bioLink ? `BIO LINK: ${bioLink}` : null,
    `FUNNEL URL: ${funnelUrl || '(none)'}`,
    `FUNNEL PAGE TEXT:\n${(funnelText || '(page not available)').slice(0, cfg.max_funnel_chars)}`,
  ].filter(Boolean).join('\n\n');

  const params = {
    model: cfg.model,
    max_tokens: cfg.max_tokens,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    output_config: { format: jsonSchemaOutputFormat(CLASSIFICATION_JSON_SCHEMA), ...(cfg.effort ? { effort: cfg.effort } : {}) },
  };
  if (cfg.temperature != null) params.temperature = cfg.temperature;

  let usd = 0; let lastErr; let lastRaw = null;
  const usageTotal = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await withBackoff(() => anthropic().messages.parse(params), { label: `anthropic ${handle}` });
    for (const k of Object.keys(usageTotal)) usageTotal[k] += res.usage?.[k] || 0;
    usd += usageCost(res.usage || {}, cfg.price_per_mtok);
    if (res.stop_reason === 'refusal') { lastErr = new Error(`refusal: ${res.stop_details?.category ?? 'unknown'}`); continue; }
    lastRaw = res.content.find((b) => b.type === 'text')?.text ?? null;
    const parsed = ClassificationSchema.safeParse(res.parsed_output);
    if (parsed.success) return { classification: parsed.data, usage: usageTotal, usd, model: res.model, attempts: attempt };
    lastErr = new Error(`schema validation failed: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const err = new Error(`classification failed after 2 attempts for @${handle}: ${lastErr?.message}`);
  err.raw = lastRaw; err.usd = usd; err.usage = usageTotal;
  throw err;
}
