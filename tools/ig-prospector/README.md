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
cp .env.example .env   # fill in APIFY_TOKEN, ANTHROPIC_API_KEY, GHL_PRIVATE_TOKEN, GHL_LOCATION_ID
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

`email` is `{ig_handle}@ig.placeholder`. It exists only so GHL can create and dedupe the contact. The domain is invalid by design. Never attach an email send, workflow, or campaign to these contacts.

`contact_email` is a real public address when one was found: mined from the Instagram bio and the cached funnel HTML (`mailto:` links and page text), filtered by `config/emails.json` (vendor/platform domains such as skool.com or thrivecart.com, template placeholders, asset file names) and dropped when the same address shows up for three or more unrelated advertisers (a page builder's template). `contact_email_source` is `bio`, `funnel_mailto`, `funnel_text`, `destination_mailto` or `destination_text`. Bio beats funnel; an address on the advertiser's own domain beats one elsewhere. Edit `config/emails.json` and rerun `npm run filter && npm run export` to re-pick without refetching.

## GHL behavior

- Contact upsert is keyed on the placeholder email (`POST /contacts/upsert`).
- Tags `source-{source}` and `niche-{niche}` are added with the append endpoint, not the upsert body (the upsert body's `tags` field overwrites all tags).
- An opportunity is created in `IG Outreach` / `Sourced` only if the contact has no opportunity in that pipeline. An existing opportunity in any stage is left alone. The tool never moves a contact backward.
- `data/ghl-sync.ndjson` records synced handles; rerun skips them unless `--force`.

## Classification

Two modes, set by `mode` in `config/classify.json`:

- `agent` (default, no API key). `npm run classify` writes the pending inputs to `data/classify-queue.ndjson` and the exact prompt, schema and answer format to `data/classify-instructions.md`. A Claude Code session (or sub-agents, one slice of the queue each) writes one line per handle to `data/classify-answers.ndjson`. Running the step again validates every answer with zod, checks its `input_hash` against the current input (stale answers are rejected), caches it, and writes the row. Bad answers land in `data/classify-failures.ndjson` with the reason and the step exits non-zero.
- `api`. Calls the Anthropic API (`ANTHROPIC_API_KEY`) with Sonnet and structured outputs, validated again with zod, one retry then the failures file. `claude-sonnet-5` rejects `temperature`; it is sent only when non-null.

In both modes prices are never guessed: `offer_price_usd` is `null` unless a number is stated. `confidence` is `low` when the page is thin. Results are cached by input hash in `cache/classify/`, so unchanged inputs are never classified twice.

## Tests

`npm test` runs unit tests and an offline end-to-end run of steps 2 through 7 in a temp directory (fixture ads, seeded caches, a local HTTP server, agent-mode classification round trip). It proves resumability, idempotency, the reject reasons, and the CSV contract without spending credits. Step 1 and live Apify / GHL calls are exercised by the 20-record acceptance run.

## Running from Claude Code on the web

The session's environment must allow outbound HTTPS to `api.apify.com` and to arbitrary funnel domains (step 4 fetches whatever the ads link to). With a restrictive network policy, steps 1, 3 and 4 cannot run; steps 2, 5, 6 and 7 can.
