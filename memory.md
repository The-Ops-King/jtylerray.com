# Project Memory - J. Tyler Ray Landing Page

## 2026-01-28 - Initial Hero Section Build

### What was done:
1. **Project Setup**
   - Created React + Vite + TypeScript project structure
   - Installed dependencies: React, Framer Motion, Lucide React
   - Configured Tailwind CSS with custom design tokens

2. **Design System**
   - Implemented black and gold color scheme with geometric aesthetic
   - Set up spacing system (multiples of 8: 4-128px)
   - Configured typography scale (H1: 48-64px, body: 16-18px)
   - Added Inter font family for headlines and body text
   - Created design tokens: --bg, --fg, --accent (gold), --border, etc.

3. **Animation Components (Reactbits.dev inspired)**
   - Built ShinyText component with gold gradient shimmer effect
   - Built CountUp component with easeOut animation for numbers
   - Built LightRays background with subtle animated rays and geometric accents

4. **Hero Component**
   - Full-screen hero section with centered content
   - Badge: "THE OPERATIONS KING"
   - Headline: "Stop Drowning in Chaos. Start Dominating Your Operations." (with ShinyText)
   - Subheadline and description
   - Two CTAs: "Book a Connection Call" (primary gold button) and "Message Me" (secondary outline)
   - Stats row with 3 animated stat cards:
     - 300+ Hours Saved
     - 75+ Automations Built
     - 10+ Platforms Mastered
   - Framer Motion staggered animations on entry
   - LightRays background effect
   - Fully responsive (mobile-first)

5. **Content Structure**
   - Created content.ts with all Hero copy following brand voice
   - Voice: Direct, intense, confident, short sentences
   - Used "kingdom" metaphor language sparingly

### Dev Server:
- Running on http://localhost:5173/
- All animations and responsiveness working

### Next Steps:
- Build remaining sections (PainGrid, ProcessSteps, Testimonials, etc.)
- Add more Reactbits.dev components (Spotlight Card, Star Border, etc.)
- Iterate on copy and design based on feedback

---

## 2026-01-28 - Hero Background Enhancement

### What was done:
1. **Enhanced LightRays Component with Geometric Gold Design**
   - Added central radial gradient with gold glow
   - Implemented SVG geometric grid pattern with gold gradients
   - Added animated diagonal lines crossing the screen (both directions)
   - Created geometric shapes:
     - Gold-tinted triangles with subtle rotation animation
     - Hexagon outlines with gold stroke gradients
     - Diamond shapes (rotated squares) with scale/opacity animations
   - Added vertical accent lines with gold-to-transparent gradients
   - Corner gradient accents (top-left, bottom-right)
   - Subtle particle dots with pulsing opacity
   - All animations use Framer Motion with easeInOut timing
   - Gold color palette: #d4af37 (base gold), #f4e4a6 (highlight gold)
   - Kept opacity subtle (0.05-0.35 range) to maintain premium feel

2. **Redesigned LightRays to emanate from top center**
   - Added props: `raysColor` and `rayLength` for customization
   - Created 11 SVG polygon rays spreading from top center at various angles (-45° to +45°)
   - Each ray is a trapezoid shape (narrow at top, wider at bottom)
   - Rays use linear gradient (bright at source, fading to transparent)
   - Added blurred ambient rays (div-based) for depth and glow
   - Top center glow source using radial gradient
   - Subtle pulsing opacity animation on each ray
   - Kept minimal geometric accents (diamonds) as secondary elements
   - Very subtle grid overlay (3% opacity)
   - Bottom fade gradient to ensure content readability

3. **Created KingdomBackground Component (replaced LightRays)**
   - Premium "Operations King" themed background
   - Gold color palette: bright (#f4e4a6), primary (#d4af37), dark (#b8941f), deep (#8b6914)
   - Crown-inspired light rays emanating from top center (5 main rays like crown points)
   - SVG-based rays with glow filter and gradient fills
   - Subtle crown silhouette hint at top (zigzag line pattern)
   - 40 floating gold particles with randomized positions, sizes, and animations
   - Large floating gold orbs with blur effect for depth
   - Geometric diamond accents with subtle pulse animations
   - Hexagon pattern overlay (2% opacity) for texture
   - Vignette edges and bottom gradient fade
   - Noise texture overlay for premium feel
   - All animations use Framer Motion with long, smooth easeInOut transitions
   - Updated Hero.tsx to use KingdomBackground instead of LightRays

---

## 2026-09-01 — /apply is back, as the closer application

Branch: `feature/apply-closer`, cut from `origin/main` (850e55b).

**Context first, because it matters.** The working copy in this folder was 20+
commits behind `origin/main` and still held the black-and-gold Tailwind app.
That app is `/legacy` now. The live site is the black-and-green build in
`hero-lab/`, whose tokens are `--ink #0c0b0a`, `--bone #f5f3ee`, `--accent
#3F7D5C`. `/apply` and `/real-estate` were retired on 2026-08-13 and
`api/apply.ts` was deleted with them.

**What was built**

- `hero-lab/src/apply/` — a fourth build target next to the page, the card and
  the lab. `Apply.tsx` imports `card/card.css` rather than restyling anything,
  so the fields, buttons and block heads are literally the card's; `apply.css`
  only adds the lede, the three terms, and the experience list.
- Fields: first name, last name, email, phone, Facebook profile, and one
  high-ticket experience box (all required), plus an intro-video link marked
  optional and highly recommended, and an off-screen honeypot. The experience
  started as a repeatable company/offer/dates list and was cut back to one box
  on 2026-09-01 — a closer describing their own record beats the same person
  filling in three date ranges.
- Contrast is lifted over the card's, scoped to `.apply`: labels go from
  `--grey-dim` (~3:1 on `--ink`, under AA) to `#b5afa4` (~9:1), inputs get a
  visible edge and well, and focus adds a green ring. The card keeps its own
  calibration — it is glanced at, this page is typed into.
- `api/apply.ts` — appends to the hiring Google Sheet through an Apps Script
  web app (`GSHEET_WEBHOOK_URL`) and mails a copy through Resend. A submission
  succeeds if either sink took it; only both failing returns a 502, so one
  service being down never loses an application.
- `Resources/apply-sheet.gs` — the Apps Script, with its one-time setup. The
  columns are Submitted At, First, Last, Email, Phone, Facebook, Intro Video,
  Experience.
- Routing: the `/apply` **301 to the root is removed** and replaced with a
  rewrite to `/apply/index.html`. That redirect was permanent, so any browser
  that hit `/apply` since 2026-08-13 has it cached and will need a hard reload.
- `scripts/build-pages.sh`, `hero-lab/vite.config.ts`, `main.tsx` and
  `package.json` all learned the fourth target; `public/apply/` is the
  committed bundle, as the other targets are.

**Still to do by hand:** deploy the Apps Script and set `GSHEET_WEBHOOK_URL` in
Vercel. Until then applications arrive by email only.

## 2026-09-01 — /apply live, and the Apps Script access trap

Shipped to production (`main` @ 8a8fc06). Live at jtylerray.com/apply.

**The one thing that cost two rounds.** The first Apps Script deployment was
scoped to the Workspace domain, not public. Its URL gave it away — a
domain-scoped web app is served at
`script.google.com/a/macros/<domain>/s/<id>/exec`, and a public one at
`script.google.com/macros/s/<id>/exec`. A Vercel function has no Google login,
so the domain-scoped one returned 401 on every POST, forever. The fix is
**Who has access: Anyone** — not "Anyone with Google Account", not "Anyone
within jtylerray.com". If a webhook ever goes quiet, POST to it directly
before touching any code: a 401 with an HTML body is this, every time.

**Vercel env (project kravok/jtylerray.com).** `GSHEET_WEBHOOK_URL` is set for
Production and Development and points at the closer-application sheet. It had
been sitting on the old real-estate sheet's webhook since ~June. `RESEND_FROM`
and `RESEND_API_KEY` were already there. Env changes need a redeploy to take —
`vercel redeploy <prod-url>` rebuilds without touching git.

Verified end to end against production: `{"ok":true,"sheet":true,"email":true}`,
and the honeypot returns a bare `{"ok":true}` having written nothing.

## 2026-11-04 — /client-onboarding: the access checklist for new clients

**What it is.** jtylerray.com/client-onboarding. A new client clicks "Start
onboarding", fills in name, email, phone, company and website, and gets a
private link (`?c=<128-bit id>`) on screen and by email. The link opens their
checklist, which saves as they go and works on any device.

**Flow.** 01 Google Workspace comes first: create team@theircompany as Super
Admin and send the password through a one-time link (onetimesecret.com),
never by email. That address is where every later invite goes, with a
per-client switch to jt@jtylerray.com. Then seven sections: Communication,
Payments, CRM, Meetings, Call recording, Calendar and Automation. Each is a
multi-select with Other and "We don't use one". Each picked tool asks "Is
Tyler a <role>?" with four answers (Yes admin / Has access, not admin / No
access / Not sure). Any answer other than admin turns red and shows that
tool's steps. Zoom, Zapier and Fathom also ask whether the plan is paid, and
No is red. Sending with red items opens an "Are you sure?" listing them.
Unanswered sections block sending.

**Files.**
- `hero-lab/src/onboarding/catalog.ts`: every section, tool, role, step and
  doc link. Adding a tool or section is an entry here and nothing else. Doc
  links are only the five checked to exist (Google ×2, Stripe, Slack, n8n).
- `hero-lab/src/onboarding/model.ts`: answers shape, plus `summarize()`,
  which decides green/red/amber/todo. Both the screen and the email use it.
- `Onboarding.tsx` / `onboarding.css`: drawn in the card's language, importing
  card.css and apply.css, like /apply.
- `api/onboarding.ts`: start / GET / PUT autosave / submit. Upstash Redis is
  the record. The Sheet is Tyler's view, upserted by id on start, on submit
  and at most every 5 min while they work. Resend emails the client their
  link, tells Tyler on start, and sends Tyler a red-first summary on submit.
  Starts are rate-limited to 10/hour/IP because each one emails a typed
  address.
- `Resources/onboarding-sheet.gs`: the upsert script, one row per client, red
  rows shaded.
- Fifth build target: `VITE_ONBOARDING`, `npm run build:onboarding`, and
  build-pages.sh copies it into public/client-onboarding. noindex and
  no-referrer headers are set in vercel.json. It is not in the sitemap.

**Still to do by hand (nothing saves until the first one is done):**
1. Vercel → Storage → Upstash for Redis (free) → connect to jtylerray.com.
   That sets KV_REST_API_URL / KV_REST_API_TOKEN.
2. A new Sheet plus onboarding-sheet.gs deployed as a web app with access
   "Anyone". Set ONBOARDING_SHEET_WEBHOOK_URL.
3. RESEND_FROM must be on a verified domain, or the client never gets their
   link email.
4. Later: a GHL Inbound Webhook workflow that texts Tyler. Set
   GHL_ONBOARDING_WEBHOOK_URL. It already gets `start` and `submit` events.
5. Redeploy after env changes.

**Tested locally.** The real handler ran against a mock Redis and sinks, and
Playwright drove the full flow: start, answer, red confirm, send, then reopen
in a fresh browser to confirm the record came back. No console errors and no
horizontal scroll at 390px.

## 2026-11-04 — /client-onboarding simplified (PRs #9 and #10)

- The start page is just the form. The contact box lives on the checklist.
- Titles are bigger and all secondary greys are lifted (`--onb-text` #d9d3c8).
- Step 01 is "Google Workspace Login": one line of instructions and one
  toggle that starts as "Not yet". The "We don't have Workspace" option and
  the "where should invites go" question are gone. Every invite now goes to
  the team@ address, and `inviteTo` was removed from the model.
- How-to steps are a closed `<details>` ("Don't know how? Click here.") on
  step 01 and on every tool not marked admin.
- Every notes box uses one placeholder. Per-tool hints were removed.
- Fanbasis is now "Fanbasis / Commas".
- Paid plan "No" shows "Ok, we'll need that." and is amber, not red. It no
  longer appears in the "Are you sure?" list. It is red only alongside a
  missing-admin answer.

## 2026-11-04 — /client-onboarding Part 2 and UX audit (PR #11)

- New access sections:
  - Contracts: PandaDoc, DocuSign
  - Applications & forms: Typeform, Jotform, GHL Forms, Fillout
  - Fulfillment platform: Skool, Kajabi, Circle, Teachable
  - SOPs: Notion, Google Docs/Drive. It asks "Where are your SOPs stored?",
    and the none option reads "We don't have a single place for SOPs".
- A section can override its question (`question`) and its none label
  (`noneLabel`) in catalog.ts.
- Part 2 "Your business" sits after the access sections, and every field is
  required to send:
  - Lead sources: chips, plus Other.
  - How calls get booked.
  - After booking, up to the close.
  - Offers: repeatable cards with name, price, payment options, program
    length, who it's for and deliverables.
  - What you deliver, and who delivers it.
- The first offer card is virtual (id "first") until typed in, so an
  untouched form saves nothing. Its id never changes, which keeps focus on
  the first keystroke.
- Part 2 is stored in `answers.business`. api/onboarding.ts reads it
  defensively for the email ("Their business") and five new Sheet columns:
  Lead Sources, Setting, After Booking, Offers, Fulfillment.
  **The Apps Script must be updated to write them**: Manage deployments →
  edit → New version, which keeps the same URL. Until then the old script
  ignores those fields.
- UX audit fixes:
  - The link and phone share one compact panel, so the first question is on
    the first phone screen.
  - The top progress bar is gone. A sticky bottom bar shows "x/y answered",
    the save state, and a "Next: …" button that jumps to the first gap
    (step 01 first while it is "Not yet").
  - Step 01 is neutral until done instead of red on arrival.
  - Blockers above Send are tap-to-jump chips.
  - A banner shows "Sent on {date}" when a client returns.
  - A pending save is flushed with `keepalive` on visibilitychange/pagehide.
    A save that failed offline is retried on `online`.
  - Tap targets are 44px or more.
- Verified by Playwright in the local harness: instant tab close keeps the
  edit, an offline edit syncs on reconnect, a second device sees it, the
  Continue link appears on return, a bad link gets a clear message, and
  nothing scrolls sideways at 390px.

## 2026-11-04 — onboarding tweaks (PR #12)

- The step 01 toggle reads "Done?" with an empty box, then "Done." with a
  check. The copy now says to send the login to jt@jtylerray.com.
- "We don't use one" (and the SOPs none option) shows "Ok, we'll need one."
  in amber. Tyler's list reads "Doesn't use one yet".
- Zapier has `slackLogin: true`. It asks "Does Tyler have access to
  Zapier?" and adds the answer "Sent Tyler the login on Slack", which counts
  as done (green). The note says: give Tyler his own access, or Slack him
  the login.
- "I don't see the second page": production was verified rendering Part 2
  after SOPs, using the live bundle with a mocked record. The cause was a
  tab opened before the deploy. The SPA doesn't reload itself.
