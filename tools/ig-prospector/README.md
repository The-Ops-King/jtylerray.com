# ig-prospector

Instagram prospect sourcing pipeline. Node.js, run from a terminal. Output is `data/export.csv` plus contacts upserted into a GoHighLevel (GHL) location.

It builds and tracks a list. It never sends a message.

## What it does not do

- It does not use the official Meta Ad Library API (that API only returns political/social-issue ads). Advertisers come from an Apify Ad Library scraper actor, or from hand-imported JSON.
- It does not use an Instagram API. Profile data comes from an Apify Instagram profile scraper actor, priced per result.
- It does not message anyone. Outreach is manual in the Instagram app; GHL tracks it.
- No UI, no scheduler, no database.

## Setup

```bash
cd tools/ig-prospector
npm install
cp .env.example .env   # fill in APIFY_TOKEN, GHL_PRIVATE_TOKEN, GHL_LOCATION_ID
```

In GHL, create a pipeline named `IG Outreach` with a first stage named `Sourced` (names are configurable in `config/ghl.json`). Then:

```bash
npm run ghl:setup   # creates the contact custom fields once, caches ids + pipeline/stage ids to config/ghl-fields.json
```

The Private Integration token needs scopes: `contacts.readonly`, `contacts.write`, `locations/customFields.readonly`, `locations/customFields.write`, `opportunities.readonly`, `opportunities.write`.

## Run order

Each step reads the previous step's file from `data/` and writes its own. Every step is resumable and skips work that is already on disk unless you pass `--force`. `--limit N` processes at most N new records in this run.

| Step | Command | Reads | Writes | Spends |
|---|---|---|---|---|
| 1 source | `npm run source` | `config/search-terms.json` | `data/raw/adlib/*.json` (raw, untouched) | Apify (Ad Library actor), one run per term |
| 2 resolve | `npm run resolve` | `data/raw/**` | `data/resolved.ndjson`, `data/unresolved.ndjson` | nothing (free HTTP fetch of funnel pages only when the ads carry no IG handle) |
| 3 enrich-profile | `npm run enrich-profile` | `resolved.ndjson` | `data/profiles.ndjson` | Apify (IG profile actor), per handle, batched |
| 4 enrich-funnel | `npm run enrich-funnel` | `profiles.ndjson` | `data/funnels.ndjson`, raw HTML in `cache/http/` | nothing |
| 5 classify | `npm run classify` | `funnels.ndjson` (+ `data/classify-answers.ndjson` in agent mode) | `data/classified.ndjson`, `data/classify-failures.ndjson`, `data/classify-queue.ndjson` | nothing in agent mode; Anthropic API in api mode |
| 6 filter | `npm run filter` | `classified.ndjson` + `config/criteria.json` | `data/qualified.ndjson`, `data/rejects.ndjson` | nothing |
| 7 export | `npm run export` (`--ghl` to push) | `qualified.ndjson` | `data/export.csv`, `data/ghl-sync.ndjson` | nothing unless `--ghl` |

`npm run status` prints row counts per stage and total spend. `data/costs.ndjson` is the spend ledger.

First run: 20 records.

```bash
npm run source -- --limit 1          # one search term
npm run resolve
npm run enrich-profile -- --limit 20
npm run enrich-funnel
npm run classify                     # agent mode: writes data/classify-queue.ndjson + instructions
#   ... a Claude Code session or sub-agents write data/classify-answers.ndjson ...
npm run classify                     # ingests + validates the answers, queues whatever is left
npm run filter
npm run export                       # CSV only
npm run export -- --ghl              # push to GHL when you want that
```

Run the same commands again: they should report everything skipped and `npm run status` should show the same spend.

## Idempotency and cost control

- Every external response is cached on disk (`cache/apify-adlib`, `cache/apify-ig/<handle>.json`, `cache/http/<url-hash>.json`, `cache/classify/<input-hash>.json`). Cached items are never re-fetched unless `--force`.
- Output files are appended one line per record as each record completes, so a kill at record 340 of 500 resumes at 340. A line torn by a kill is skipped and re-processed.
- Concurrency is 3 for every external call, with exponential backoff on 429 / 5xx / network errors.
- Apify runs carry `maxTotalChargeUsd` and `maxItems` caps from `config/actors.json` and `config/search-terms.json`, enforced by Apify itself.
- The terminal shows a running count of records and dollars per step.

## Configuration

- `config/criteria.json`: HARD rules only (business type, agency, profile reachable, follower floor, ad age). A row failing one is never exported; every reject carries `rejected_by` and `reject_detail`. `null` disables a rule.
- `config/scoring.json`: grading for everything that passes. Each signal adds points; `fit_score`, `fit_tier` (A/B/C/D) and `fit_notes` (which signals fired) land in the CSV so you slice there instead of re-running. Change either file and rerun `npm run filter` only.
- `config/search-terms.json`: Ad Library search terms, country, active status, max ads per term.
- `config/actors.json`: Apify actor ids, input templates, and the output field paths to read. Swap actors here without touching code. If an actor's input schema differs, Apify rejects the run with a validation error before charging.
- `config/classify.json`: model, effort, max funnel chars, `prompt_version` (bump it when you change the prompt so cached results are recomputed).
- `config/ghl.json`: API base/version, pipeline and stage names, custom field definitions.

## Hand-imported advertisers

### Seed sources (handles found without the Ad Library)

Three extra steps find Instagram handles some other way and write them to `data/raw/seeds/<source>/`. `resolve` folds them in with `source` set to the directory name (`skool`, `ig_search`, `ig_related`), so the CSV can be sliced by source. Seed rows have no ad data (`ads_running` 0, `ad_days_active` blank) and skip the `min_ad_days_active` rule; they earn the ad points in scoring only if the same handle also advertises. All three read the niche list in `config/niches.json`.

- `npm run source:skool` (free). Searches Skool discovery for each niche's `skool_queries`, opens every community with at least `min_members` (`config/skool.json`), and takes the owner's Instagram link when they list one (about 40% do). The owner's website, else the community about page, becomes the funnel. Every community seen lands in `data/skool-groups.ndjson`; the community name, members and monthly price ride along into the CSV (`community_url`, `community_members`, `community_price_monthly`) and score as `community_50+` / `community_paid` in `config/scoring.json`. Pages are cached; `--force` refetches, `--niche <key>` runs one niche.
- `npm run source:ig-search` (Apify, about $0.0023 per result). One Instagram user-search run per niche with its `ig_queries`; `config/ig-search.json` sets results per query and the per-run spend cap. Cached by input, so a rerun spends nothing unless the queries change.
- `npm run source:related` (free). Reads the `relatedProfiles` the profile scraper happened to return for qualified handles and seeds the ones the pipeline has not seen. The scraper does not return them on demand, so this is a small one-time bump after each `enrich-profile`.

After any seed step: `npm run resolve && npm run enrich-profile && npm run enrich-funnel && npm run classify` as usual.

### Manual imports

Drop a JSON array into `data/raw/manual/<name>.json`. Each object may have `page_id`, `page_name`, `instagram_actor_name` (or an instagram URL in `link_url`), `link_url` (funnel), `start_date`, `is_active`, `source_detail`. Rows from manual files get `source: manual` and skip the `min_ad_days_active` rule.

## Data model

One record per Instagram handle (lowercase, no `@`). CSV columns, in order:

`first_name, last_name, email, phone, ig_handle, ig_url, follower_count, offer_price, funnel_url, funnel_type, ads_running, ad_days_active, niche, team_signal, source, source_detail, date_sourced, notes` followed by `contact_email, contact_email_source` and the grading columns `fit_tier, fit_score, fit_notes, business_type, confidence, days_since_last_post, last_post_at, post_count, bio_link, fb_page_name`.

`email` is the prospect's real public address when one was found, and otherwise `{ig_handle}@ig.placeholder`, whose domain is invalid by design (GHL will not create a contact without an email). About a fifth of the column is deliverable and the rest hard-bounces, so **never point an email send at the whole list**: `ig-has-email` is the only safe audience, and a send to `ig-prospect` would hard-bounce on every placeholder and take the sending domain with it.

`contact_email` is a real public address when one was found: mined from the Instagram bio and the cached funnel HTML (`mailto:` links and page text), filtered by `config/emails.json` (vendor/platform domains such as skool.com or thrivecart.com, template placeholders, asset file names) and dropped when the same address shows up for three or more unrelated advertisers (a page builder's template). `contact_email_source` is `bio`, `funnel_mailto`, `funnel_text`, `destination_mailto` or `destination_text`. Bio beats funnel; an address on the advertiser's own domain beats one elsewhere. Edit `config/emails.json` and rerun `npm run filter && npm run export` to re-pick without refetching.

When two prospects mine the same address — sibling accounts of one business share an inbox — only one can carry it, because GHL enforces unique emails per location. The owner is the higher `fit_score`, then the first handle alphabetically, so the choice never depends on which API call lands first; the others fall back to their placeholder, drop out of `ig-has-email`, and get `contact_email_source` = `shared_with_<owner>`.

## GHL behavior

### Segments (GHL has no smart-list API)

Every synced contact is tagged `ig-prospect`, `ig-src-<source>`, `ig-tier-<tier>` and `ig-niche-<niche>`, plus one tag per matching segment in `config/ghl.json`. GHL exposes no endpoint for saved smart lists, so a segment *is* a tag: filter on it once in Contacts and save that as a smart list, or use it directly in a workflow. Underscores in a value become hyphens, so `ig_search` tags as `ig-src-ig-search`.

Segments ship with two entries: `ig-shortlist` (the funnel asks for a call, an application or a webinar seat, and the account has 3,000 to 100,000 followers) and `ig-has-email` (a deliverable address, the only safe audience for an email send). A segment matches only when every clause it declares holds; supported clauses are `funnel_type_in`, `min_followers`, `max_followers` and `has_contact_email`. After editing them, run `npm run export -- --ghl --retag` to re-apply tags to contacts already in GHL without re-pushing every field.

- Contacts are matched by their `IG Handle` custom field and updated in place (`PUT /contacts/{id}`), and only created with `POST /contacts/upsert` when the handle is genuinely new. Matching on the handle is what keeps a rerun safe: the email column now holds real addresses, so it is no longer a stable dedupe key, and an upsert against a changed email would create a second contact. Every handle GHL already holds is read once at the start of a `--ghl` run, so a fresh checkout with no local `data/ghl-sync.ndjson` does not duplicate the list.
- Tags `source-{source}` and `niche-{niche}` are added with the append endpoint, not the upsert body (the upsert body's `tags` field overwrites all tags).
- An opportunity is created in `IG Outreach` / `Sourced` only if the contact has no opportunity in that pipeline. An existing opportunity in any stage is left alone. The tool never moves a contact backward.
- `data/ghl-sync.ndjson` records synced handles; rerun skips them unless `--force`.

## Daily warm-up ladder

`npm run warmup` (config in `config/warmup.json`) runs the daily Instagram warm-up: a prospect is followed, then
commented on, then engaged with, then DMed, over four dated touches. GoHighLevel holds every bit of the state — the
opportunity's stage in the `IG Warm-Up` pipeline is the prospect's stage, and one task per prospect is the thing you tick
to advance it — so the job needs nothing from this machine and works from any fresh checkout.

Each run: advance whoever ticked their task, re-raise anyone stalled without one, cap the day, top up from the
`ig-shortlist` tag with the highest `fit_score` prospects not yet enrolled, and write `data/warmup-digest.md` plus a
`.html` version for email.

Two things about the arithmetic, because both are easy to get wrong:

- **Gaps are measured from the day a touch was due, not from the day the run notices the tick.** A tick is always seen a
  run late, so spacing from the run day would add a day to every gap and stretch a 5-day ladder into a 9-day one. With a
  one-day gap this means an advance is usually part of the same day's work: the card moves and the next touch is due
  immediately.
- **`daily_touch_cap` caps the day's work, not just intake.** Once two cohorts' stages collide, the ladder alone can ask
  for more touches than the cap, and 30 comments in an afternoon is how an Instagram account gets throttled. The excess
  moves a day out instead, keeping the furthest-along prospects (delaying a DM wastes the warm-up that earned it) and
  then the best fit. A day that had to push work out takes nobody new.

Throughput follows from the cap, not from a separate setting: four touches per prospect against a cap of 15 settles at
roughly 3 new prospects and 3 DMs a day, with about 30 in flight. Raise `daily_touch_cap` to raise both.

`--dry-run` plans and writes the digest without touching GoHighLevel; `--cap N` overrides the cap for one run.

## Classification

Two modes, set by `mode` in `config/classify.json`:

- `agent` (default, no API key). `npm run classify` writes the pending inputs to `data/classify-queue.ndjson` and the exact prompt, schema and answer format to `data/classify-instructions.md`. A Claude Code session (or sub-agents, one slice of the queue each) writes one line per handle to `data/classify-answers.ndjson`. Running the step again validates every answer with zod, checks its `input_hash` against the current input (stale answers are rejected), caches it, and writes the row. Bad answers land in `data/classify-failures.ndjson` with the reason and the step exits non-zero.

In both modes prices are never guessed: `offer_price_usd` is `null` unless a number is stated. `confidence` is `low` when the page is thin. Results are cached by input hash in `cache/classify/`, so unchanged inputs are never classified twice.

## Tests

`npm test` runs unit tests and an offline end-to-end run of steps 2 through 7 in a temp directory (fixture ads, seeded caches, a local HTTP server, agent-mode classification round trip). It proves resumability, idempotency, the reject reasons, and the CSV contract without spending credits. Step 1 and live Apify / GHL calls are exercised by the 20-record acceptance run.

## Running from Claude Code on the web

The session's environment must allow outbound HTTPS to `api.apify.com` and to arbitrary funnel domains (step 4 fetches whatever the ads link to). With a restrictive network policy, steps 1, 3 and 4 cannot run; steps 2, 5, 6 and 7 can.
