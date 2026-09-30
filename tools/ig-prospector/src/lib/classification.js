import { z } from 'zod';

/**
 * The classification contract: the prompt and the exact shape of an answer. Nothing here calls a model.
 * Classifying is done by a Claude Code session or sub-agents reading data/classify-instructions.md (generated from
 * SYSTEM_PROMPT below) and writing answers to data/classify-answers.ndjson, which the classify step validates against
 * ClassificationSchema. SYSTEM_PROMPT is hashed into the cache key, so editing it re-queues every prospect.
 */
export const CLASSIFICATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    owner_first_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    owner_last_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    business_type: { type: 'string', enum: ['coach', 'consultant', 'course_creator', 'agency_or_done_for_you', 'software', 'local_business', 'ecommerce_or_product', 'institution', 'other'] },
    niche: { type: 'string', enum: ['fitness', 'business', 'relationship', 'health', 'finance', 'other'] },
    funnel_type: { type: 'string', enum: ['booking', 'application', 'webinar', 'checkout', 'none'] },
    offer_price_usd: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    sells_to_coaches_about_getting_first_client: { type: 'boolean' },
    is_agency_or_systems_provider: { type: 'boolean' },
    team_signal: { type: 'string', enum: ['solo', 'has_setter', 'has_closer', 'hiring', 'unknown'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['owner_first_name', 'owner_last_name', 'business_type', 'niche', 'funnel_type', 'offer_price_usd', 'sells_to_coaches_about_getting_first_client', 'is_agency_or_systems_provider', 'team_signal', 'confidence'],
};

export const ClassificationSchema = z.object({
  owner_first_name: z.string().nullable(),
  owner_last_name: z.string().nullable(),
  business_type: z.enum(['coach', 'consultant', 'course_creator', 'agency_or_done_for_you', 'software', 'local_business', 'ecommerce_or_product', 'institution', 'other']),
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
- business_type: what kind of business this is. coach = a person or personal brand selling coaching, mentoring or a transformation program (fitness, health, relationship, business, mindset, sales coaching all count; a coach-for-coaches counts). consultant = expertise-led advisory for businesses, possibly a small firm, sold through calls. course_creator = mainly sells courses, memberships or communities under a personal brand. agency_or_done_for_you = executes work for clients: marketing, ads, funnels, lead generation, sales teams, recruiting, publishing, placement. software = SaaS, app or platform. local_business = gym, studio, clinic, practice, realtor, law firm, dealership or any business serving a locality. ecommerce_or_product = physical or digital products with a cart. institution = school, university, nonprofit, union, franchise headquarters, corporation. other = none of these or unclear.
- niche: fitness (body, training, nutrition), business (making money, sales, marketing, agencies, entrepreneurship), relationship (dating, marriage, family), health (medical, mental health, wellness, mindset without a money angle), finance (investing, trading, real estate, credit), other.
- funnel_type: what the primary call to action on the page asks the visitor to do. booking = schedule a call on a calendar. application = fill out a qualifying form / apply. webinar = register for a training, masterclass, workshop or challenge. checkout = buy directly with a price and payment. none = no clear CTA, page failed to load, or only social/newsletter links.
- offer_price_usd: the price of the main offer ONLY if a specific number is stated on the page or bio. Convert to USD only if the currency is explicit. If no price is stated, null. Never estimate or guess a price. Payment plans: use the total if stated, else null.
- sells_to_coaches_about_getting_first_client: true only if the offer teaches coaches/consultants/freelancers how to get their first clients, launch, or start an online business. False for offers aimed at established businesses or at non-coach consumers.
- is_agency_or_systems_provider: true if this is a marketing agency, ads agency, funnel/automation/CRM builder, software company, or any done-for-you service provider rather than a coach selling coaching.
- team_signal: has_setter if the page or bio mentions a setter, appointment setter or "my team will reach out"; has_closer if it mentions closers, sales reps or enrollment advisors; hiring if it advertises open roles; solo if the copy is clearly a single person doing everything; unknown otherwise.
- confidence: low whenever the page text is short, blocked, a login wall, an error page, or mostly navigation; medium when the page loaded but the offer is only implied; high when the bio and page clearly describe the offer, the CTA and the person.

Rules: null is a correct answer. Do not infer prices from words like "premium" or "high-ticket". Use only the text provided.`;
