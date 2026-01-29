# memory.md — J. Tyler Ray (jtylerray.com) — Build Spec + Style Guide
Last updated: 2026-01-28

## 0) Prime directive (what you are building)
You are helping me build a **React-based landing page** for my personal brand + business on **jtylerray.com**: **J. Tyler Ray — “The Operations King.”** :contentReference[oaicite:0]{index=0}

The site’s job:
- Convert qualified visitors into **booked calls/messages**
- Make it instantly clear **what I do**, **who it’s for**, and **what outcomes I deliver**
- Show credibility via **proof + projects + specificity**, not vague “I do automations” claims :contentReference[oaicite:1]{index=1}

## 1) Brand positioning (who I am)
**J. Tyler Ray — The Operations King.** :contentReference[oaicite:2]{index=2}

Core identity:
- “Former high-ticket closer turned the king of operations.” :contentReference[oaicite:3]{index=3}
- I build systems that **save hundreds of hours** and **stop deals from slipping away**. :contentReference[oaicite:4]{index=4}
- I bridge the gap between **sales reality** and **ops execution** (“I speak both languages”). :contentReference[oaicite:5]{index=5}

Brand metaphor:
- **Kingdom / dragons / monsters / bandits / building walls / fortifying infrastructure**
- It’s intentionally a little “extra,” but it must still feel **clean, premium, and competent**. :contentReference[oaicite:6]{index=6}

## 2) What I do (services, in plain English)
I design + implement **operations systems** for high-ticket businesses, especially sales teams:
- CRM rebuilds + pipeline hygiene (especially GoHighLevel)
- Automated follow-up + lead routing + tagging + nurturing
- Pre-call prep systems (data pull + reminders + materials)
- Dashboards + reporting (performance, pipeline velocity, forecasting, at-risk alerts)
- Lead tracking + attribution (UTMs, ROI visibility)
- Webinar + funnel automations (registration → replay → behavior-based follow-up)
- Lead scoring + “hot lead” alerts
- Membership/community infrastructure
- Notion workspaces for operations + SOPs + onboarding
- Integrations across Zapier / Make / n8n / Airtable / Notion / Slack / APIs :contentReference[oaicite:7]{index=7}

My promise (don’t water this down):
- **Systems that actually work. Delivered faster than you expect.** :contentReference[oaicite:8]{index=8}

## 3) Who it’s for (ideal customer)
Primary ICP:
- High-ticket offer owners, coaching/consulting brands, sales orgs
- Teams drowning in admin + broken follow-up + CRM chaos
- Leaders who feel like the “glorified admin assistant” in their own business :contentReference[oaicite:9]{index=9}

Symptoms to call out (use their pain language):
- Deals slipping through cracks, dead-lead graveyard CRM :contentReference[oaicite:10]{index=10}
- Pre-call prep eating hours :contentReference[oaicite:11]{index=11}
- Manual reporting, scattered SOPs, messy onboarding :contentReference[oaicite:12]{index=12}
- Scaling makes chaos multiply :contentReference[oaicite:13]{index=13}

Not for:
- People who want a “quick Zap” but refuse to change broken processes
- Ultra-low budget DIYers who won’t implement

## 4) Proof points (use specific numbers & concrete outcomes)
Use these (and format as big stat chips / cards):
- “Saved one client **300+ hours**” :contentReference[oaicite:14]{index=14}
- “**75+ automations** built” :contentReference[oaicite:15]{index=15}
- “**10+ platforms** mastered (GHL, Close, Hubspot, Zapier, Make, n8n, Airtable, Notion, Hyros…)” :contentReference[oaicite:16]{index=16}
- Testimonials (quote block style) :contentReference[oaicite:17]{index=17}

Also use “projects” as proof (problem → solution → result):
- Pre-call automation system :contentReference[oaicite:18]{index=18}
- CRM rebuild :contentReference[oaicite:19]{index=19}
- Follow-up sequence :contentReference[oaicite:20]{index=20}
- Onboarding machine :contentReference[oaicite:21]{index=21}
- Pipeline dashboard :contentReference[oaicite:22]{index=22}
- Attribution / webinar / lead scoring / membership / Notion ops :contentReference[oaicite:23]{index=23}

## 5) Calls-to-action (CTAs)
Primary CTA:
- **Book a Connection Call** (calendar link) :contentReference[oaicite:24]{index=24}
LINK: https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1sNdq-fawbkAreIeJGRBENL0uXrpEAvGVGj6JXNZv8B00hdPgkoYIDvSotwQotDPXGe_LL5drV

Secondary CTAs:
- “Message me here” :contentReference[oaicite:25]{index=25} should message me at jt@jtylerray.com
- Networking call / general contact entry points exist on the contact page :contentReference[oaicite:26]{index=26}

CTA rules:
- Always visible above the fold
- Repeat after: pain section, proof/projects section, and final close
- Keep CTA copy confident, low-pressure: “No pressure, no pitch—just a real discussion…” :contentReference[oaicite:27]{index=27}

## 6) Voice & copywriting style guide
Tone:
- Direct, intense, confident
- Short sentences. Punchy headers.
- “Sales brain + builder brain”
- Uses kingdom metaphor sparingly but consistently (don’t overdo it)

DO:
- Name pains vividly (“revenue bandits”, “time thieves”, “CRM graveyard”) :contentReference[oaicite:28]{index=28}
- Use outcome language: save hours, prevent leaks, improve follow-up, speed to lead
- Use specificity: tools, workflows, metrics, examples
- Write like a closer: clarity + momentum + certainty

DON’T:
- Don’t sound like generic “AI automation agency”
- Don’t use buzzword soup (synergy, leverage, revolutionary)
- Don’t overpromise outcomes you can’t defend
- Don’t write long paragraphs—break into scannable chunks

Copy patterns to use:
- **Stop X. Start Y.** (matches “Stop Drowning, Start Dominating.”) :contentReference[oaicite:29]{index=29}
- **Problem → Solution → Result** (project cards) :contentReference[oaicite:30]{index=30}
- “You didn’t build a business to…” (empathetic punch) :contentReference[oaicite:31]{index=31}

## 7) Information architecture (landing page sections)
Target section order:
1. Hero: headline + subhead + 2 CTAs + stat chips
2. “You’re bleeding…” pain grid (dragons/bandits/thieves/monsters)
3. “Here’s how I build your kingdom” (3-step process)
4. Proof: testimonial + stats
5. Project highlights (problem/solution/result cards)
6. “Why I’m different” (sales background + ops execution)
7. Toolkit / capabilities list (platforms + systems)
8. How we work together (strategy call → proposal → build/test/dominate)
9. Final close + CTA
10. Footer: location + email :contentReference[oaicite:32]{index=32}

## 8) React implementation preferences (how to build)
Assume:
- React + modern component architecture
- Mobile-first, responsive, performance-minded
- Components should be reusable and config-driven where it makes sense

Preferred UI approach:
- Tailwind for styling (utility-first)
- Framer Motion for tasteful motion (hero entrance, hover, section reveal)
- Keep animations subtle: opacity/translate/blur reveals, not gimmicky, yet very dynamic
- Use Reactbits.dev for animations
    - Gradient Magic or Shiny Text for Titles
    - Numbers specifically should be dynamic using Count Up, with Gradient Text
    - Star Border to highlight things that need attention drawn to them
    - Use a Spotlight Card to highlight boxes
    - Animated List
    - Use a Staggered menu
    - Card Swap
    
- For the background use "Light Rays"

    - Other potential Reactbits.dev options:
        - decrypted text
        - Scroll Float
        - Scroll Reveal
        - Rotating Text
        - Glare Hover
        - Logo Loop
        - Gradual Blur
        - Click Spark
        - Shape Blur
        - Scroll Stack
        - Carousel
Component checklist:
- `<Hero />`
- `<StatsRow />`
- `<PainGrid />`
- `<ProcessSteps />`
- `<Testimonial />`
- `<ProjectCards />`
- `<Toolkit />`
- `<HowWeWork />`
- `<CTASection />`
- `<Footer />`

Data-driven content:
- Put copy + project items + metrics into a `content.ts` (or JSON) so we can iterate quickly without rewriting components.

## 9) Visual style guide (design tokens)
Overall feel:
- Premium, dark, high-contrast, “operator” energy
- Big typography, clean spacing, strong hierarchy

Color (token names, not hard values):
- `--bg` (dark)
- `--fg` (near-white)
- `--muted` (gray for secondary text)
- `--card` (slightly lighter than bg)
- `--accent` (one bold accent color used for CTAs, badges, highlights)
- `--danger` (sparingly for “bleeding/leaks” callouts)

Typography:
- Headlines: heavy weight, tight tracking, large sizes
- Body: readable, slightly larger than default
- Use ALL CAPS sparingly for badges (“AI-Powered Sales Intelligence” style badge exists on current site) :contentReference[oaicite:33]{index=33}

Layout:
- Max width container (comfortable reading)
- Lots of whitespace
- Cards with soft shadow + subtle border
- Rounded corners (consistent radius)

Iconography:
- Simple icons (lucide style)
- Use themed icons for pain section (dragon/bandit/thief/monster vibe) but keep them clean (not cartoony)

## 10) Content guardrails (accuracy rules)
- If you don’t have a concrete number or proof, **use a placeholder** like `[INSERT PROOF]` instead of inventing it.
- Never claim client results beyond what’s on-site unless I provide it.
- Keep the offer consistent with the site: operations + systems + implementation for sales teams. :contentReference[oaicite:34]{index=34}

## 11) “When in doubt” decision rules
If choosing between:
- Clever vs clear → choose clear
- More sections vs tighter story → choose tighter story
- Generic vs specific → choose specific (projects, tools, outcomes)
- Loud metaphor vs premium trust → keep metaphor, but keep it premium

## 12) Quick glossary (keywords that should appear)
- Operations, systems, automations, follow-up, pipeline, CRM, dashboards
- GoHighLevel (GHL), Zapier, Make, n8n, Airtable, Notion, HubSpot, Close
- High-ticket sales, lead routing, speed-to-lead, attribution, onboarding, SOPs :contentReference[oaicite:35]{index=35}

## 13) UI / DESIGN SYSTEM STYLE GUIDE (HARD RULES)

This section defines **non-negotiable layout, spacing, typography, and motion rules**.
If something is not specified here, choose the **simplest, cleanest, most premium** option.

---

### 13.1 Layout & Spacing System

**Base unit**
- All spacing must be a **multiple of 8**
- Valid spacing values: `4, 8, 16, 24, 32, 40, 48, 64, 80, 96, 128`
- Default section padding:  
  - Mobile: `px-16 py-64`  
  - Desktop: `px-32 py-96`

**Vertical rhythm**
- Sections should feel **airy and intentional**
- Never stack sections closer than `64px`
- Headlines → content gap: `24–32px`
- Card internals: `16–24px`

**Container**
- Max width: `1200–1280px`
- Centered
- Full-bleed sections are allowed ONLY for:
  - Hero
  - CTA sections
  - Dark “divider” sections

---

### 13.2 Grid System

- Use a **12-column grid** conceptually (even if not explicitly coded)
- Most content lives in:
  - 1-column (mobile)
  - 2–3 columns (desktop)
- Avoid 4+ column layouts unless data-dense (stats, tool icons)

**Card grids**
- Gap between cards: `24px`
- Cards should always align cleanly—no masonry chaos

---

### 13.3 Typography System

**Font stack (approved)**
- Primary (Headlines): `Inter` or `Satoshi`
- Secondary (Body): `Inter`
- Optional accent (rare): `JetBrains Mono` (for metrics, code-y labels only)

**Font weights**
- Headlines: `700–900`
- Subheads: `600`
- Body: `400–500`
- Muted/meta text: `400`

**Type scale (desktop targets)**
- H1: `48–64px`
- H2: `36–44px`
- H3: `28–32px`
- H4: `20–24px`
- Body: `16–18px`
- Small/meta: `13–14px`

**Rules**
- Headlines are **short, declarative, and scannable**
- Never exceed ~65–70 characters per line for body text
- Use ALL CAPS only for:
  - Badges
  - Micro labels
- Line-height:
  - Headlines: `1.1–1.2`
  - Body: `1.5–1.7`

---

### 13.4 Color System

**Palette roles (do not invent new ones casually)**
- `--bg` → primary background (dark)
- `--bg-elevated` → cards / panels
- `--fg` → primary text
- `--fg-muted` → secondary text
- `--border` → subtle outlines
- `--accent` → CTAs, highlights, badges
- `--danger` → “bleeding / leaks / risk” language

**Rules**
- Backgrounds are dark by default
- Text contrast must pass accessibility standards
- Accent color is used **sparingly**:
  - CTAs
  - Key stats
  - Underlines / focus states
- Never use more than **1 accent color** on a page

---

### 13.5 Buttons & CTAs

**Primary CTA**
- Solid background using `--accent`
- High contrast text
- Medium-large padding
- Slightly rounded corners

**Secondary CTA**
- Outline or ghost style
- Uses `--fg` and `--border`
- Never competes visually with primary CTA

**Button rules**
- Button height: `44–52px`
- Horizontal padding: `20–28px`
- Hover states are subtle:
  - Slight brightness
  - Slight lift (`translateY(-1px)`)

---

### 13.6 Cards & Surfaces

**Card styling**
- Background: `--bg-elevated`
- Border: `1px solid --border`
- Border radius: `12–16px`
- Shadow: soft, low-opacity, never harsh

**Rules**
- Cards should feel **solid and grounded**
- No neon glows
- No heavy gradients
- Depth comes from spacing, not effects

---

### 13.7 Motion & Animation

**Library**
- Framer Motion only

**Animation philosophy**
- Motion should **guide attention**, not entertain
- If an animation is noticeable, it’s too much

**Allowed animations**
- Fade + slight upward motion on enter
- Staggered children reveals
- Subtle hover lift on cards/buttons
- Micro-blur → sharp reveal for hero text

**Timing**
- Duration: `0.4–0.7s`
- Ease: `easeOut`
- Delay: `0.05–0.15s` per stagger

**Never**
- Bounce
- Elastic easing
- Auto-playing complex timelines

---

### 13.8 Icons & Visual Elements

**Icons**
- Simple, stroke-based (Lucide-style)
- Consistent size: `20–24px`
- Color: `--fg-muted` or `--accent` only

**Metaphor visuals**
- Dragons / bandits / monsters = symbolic
- Abstract > literal
- Never cartoony
- Should feel like **enterprise-grade myth**, not fantasy art

---

### 13.9 Responsiveness Rules

- Mobile-first always
- Touch targets ≥ `44px`
- No horizontal scrolling ever
- Typography scales down gracefully—not crushed

**Breakpoints**
- Mobile: `<640px`
- Tablet: `640–1024px`
- Desktop: `>1024px`

---

### 13.10 Code Style Expectations (for React)

- Components are small and composable
- No inline magic numbers—use tokens or constants
- Layout components should accept:
  - `title`
  - `subtitle`
  - `cta`
- Content lives outside components when possible

---

### 13.11 Design North Star

If a design decision feels ambiguous, ask:
> “Does this feel like it was built by someone who runs elite sales operations for a living?”

If the answer is no—simplify, tighten, or remove it.


### 14 Memory

Before every new major action, reference the memory.md to remember what you've done, and after every new major  action append to the end of the memory.md a summary of what you've done.