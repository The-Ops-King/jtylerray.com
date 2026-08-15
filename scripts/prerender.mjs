import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { transform } from 'esbuild';

/**
 * Put the page's own words into the HTML that ships.
 *
 * The page is a client-rendered React app: the built HTML is a <div id="root">
 * and a script tag, and nothing else. A browser fills it in, but anything that
 * reads the HTML without running JavaScript — search crawlers, link unfurlers,
 * and the AI agents people increasingly ask about a person before they visit
 * the site — got the title and the meta description and no body copy at all.
 * Every path returned that same empty shell, because vercel.json rewrites
 * everything to it.
 *
 * So the copy is written into #root at build time. React's createRoot() clears
 * the container on its first render, so the moment the app mounts this is gone
 * and the rendered page is untouched; until then it is the page in text. That
 * is the same trick the old landing page used (see the root index.html), done
 * here against the build output rather than by hand.
 *
 * The copy is read from hero-lab/src/site/content.ts — the page's own source,
 * not a copy of it — so the two cannot drift. content.ts is data and types
 * only, which is why esbuild can strip it to plain JS and this can import it.
 *
 * What this deliberately is NOT: server-side rendering. Rendering Site.tsx
 * would mean a second React runtime in the build, hydration in place of a
 * plain mount, and a class of mismatch bugs that break the visible page when
 * they go wrong. The failure mode of this approach is stale text; the failure
 * mode of that one is a broken site.
 */

const SITE = 'https://jtylerray.com';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * These content modules hold no imports and no runtime types, so stripping the
 * TypeScript leaves a module Node can import directly off a data URL. Bundling
 * would pull in nothing extra and cost a resolver.
 */
async function loadModule(root, rel) {
  const src = await readFile(resolve(root, rel), 'utf8');
  const { code } = await transform(src, { loader: 'ts', format: 'esm' });
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  return import(url);
}

const loadContent = (root) => loadModule(root, 'hero-lab/src/site/content.ts');
const loadCard = (root) => loadModule(root, 'hero-lab/src/card/data.ts');

/**
 * The reviews are screenshots, and their alt text is the transcription of what
 * each one says — which makes it the only form of that praise a reader without
 * images has. receipts.ts imports the PNGs themselves, so it cannot be imported
 * here the way content.ts can; the transcriptions are read out of the source
 * text instead. No matches means no section, not a broken build.
 */
async function loadReviewText(root) {
  const path = resolve(root, 'hero-lab/src/site/receipts.ts');
  const src = await readFile(path, 'utf8').catch(() => '');
  return [...src.matchAll(/^\s*alt:\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)].map((m) =>
    JSON.parse(`"${m[1]}"`)
  );
}

/**
 * The portrait, for the link preview. Its filename carries a content hash that
 * changes whenever the image does, so it is found on disk after the build
 * rather than written down here and left to rot.
 */
async function findPortrait(dist) {
  const dir = resolve(dist, 'new-home/assets');
  const files = await readdir(dir).catch(() => []);
  const hit = files.find((f) => /^suit-.*\.(jpe?g|png|webp)$/.test(f));
  return hit ? `${SITE}/new-home/assets/${hit}` : null;
}

/* ── the block that goes in #root ──────────────────────────────────── */

function body(c, reviews) {
  const { HERO, RAIL, WHAT_I_DO, SUITE, TIMELINE, CONTACT, CONTACT_URL, EMAIL, BOOKING } = c;

  const rail = RAIL.map(
    (r) => `<li><strong>${esc(r.label)}</strong> — ${esc(r.sub)}</li>`
  ).join('');

  const prose = WHAT_I_DO.prose.map((p) => `<p>${esc(p)}</p>`).join('');

  const suite = SUITE.map(
    (area) => `<section>
          <h3>${esc(area.category)}</h3>
          <ul>${area.items
            .map(
              (i) =>
                `<li><strong>${esc(i.title)}</strong>${i.detail ? ` — ${esc(i.detail)}` : ''}</li>`
            )
            .join('')}</ul>
        </section>`
  ).join('');

  const timeline = TIMELINE.map(
    (e) => `<li>
            <p class="pre-period">${esc(e.period)}</p>
            <h3>${esc(e.title)}</h3>
            <p>${esc(e.line)}</p>
          </li>`
  ).join('');

  const says = reviews.length
    ? `<h2>04 · What people say</h2>
        <p class="pre-note">Transcribed from the screenshots on the page.</p>
        <ul>${reviews.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
    : '';

  /* The headline is three parts because the middle one takes the accent on the
     rendered page. In text it is one sentence. */
  const headline = HERO.headline.join('');

  return `<main class="prerender">
        <header>
          <p class="pre-wordmark">J. Tyler Ray</p>
          <p class="pre-eyebrow">${esc(HERO.eyebrow)}</p>
        </header>

        <h1>${esc(headline)}</h1>
        <p class="pre-lede">${esc(HERO.subtext)}</p>
        <p class="pre-note">${esc(HERO.note)}</p>

        <p>
          <a class="pre-cta" href="${esc(CONTACT_URL)}">Get in touch</a>
          <a class="pre-cta pre-cta-ghost" href="${esc(BOOKING)}">Book a call</a>
        </p>

        <h2>What I build</h2>
        <ul>${rail}</ul>

        <h2>01 · What I do</h2>
        ${prose}

        <h2>02 · The work</h2>
        ${suite}

        <h2>03 · Who I am</h2>
        <ul class="pre-timeline">${timeline}</ul>

        ${says}

        <h2>05 · ${esc(CONTACT.headline)}</h2>
        <p>${esc(CONTACT.line)}</p>
        <p><a href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a> · <a href="${esc(CONTACT_URL)}">Contact card</a></p>
      </main>`;
}

/* ── the block that goes in <head> ─────────────────────────────────── */

function head(c, description, portrait) {
  const { HERO, RAIL, SUITE, WHAT_I_DO, EMAIL, CONTACT_URL } = c;
  const title = 'J. Tyler Ray — Systems & Operations';

  /* Claims are the page's own. Nothing is asserted here that a reader would
     not find in the copy above. */
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: title,
    url: `${SITE}/`,
    description,
    areaServed: 'US',
    slogan: HERO.eyebrow,
    knowsAbout: RAIL.flatMap((r) => [r.label, ...r.sub.split(' · ')]),
    founder: {
      '@type': 'Person',
      name: 'J. Tyler Ray',
      jobTitle: 'Systems and operations consultant',
      description: WHAT_I_DO.prose[2],
      email: `mailto:${EMAIL}`,
      url: `${SITE}/`,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'The work',
      itemListElement: SUITE.map((area) => ({
        '@type': 'OfferCatalog',
        name: area.category,
        itemListElement: area.items.map((i) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: i.title, description: i.detail ?? undefined },
        })),
      })),
    },
    sameAs: [`${SITE}${CONTACT_URL}`],
  };

  const image = portrait
    ? `
    <meta property="og:image" content="${esc(portrait)}" />
    <meta property="og:image:alt" content="J. Tyler Ray" />
    <meta name="twitter:image" content="${esc(portrait)}" />`
    : '';

  return `
    <!-- Injected at build time by scripts/prerender.mjs. -->
    <link rel="canonical" href="${SITE}/" />
    <meta name="author" content="J. Tyler Ray" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="J. Tyler Ray" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${SITE}/" />
    <meta property="og:locale" content="en_US" />${image}

    <meta name="twitter:card" content="${portrait ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />

    <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
    </script>
${PRERENDER_CSS}
  `;
}

/**
 * Styling for the text in #root. It is replaced the moment React mounts, so
 * this only ever paints on the way there — and on the dark ground, in the
 * page's own type, so the swap is not a change of scene.
 */
const PRERENDER_CSS = `
    <style>
      .prerender { max-width: 62rem; margin: 0 auto; padding: 5rem 1.5rem; background: #0c0b0a; color: #8a857c; font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-size: 1rem; line-height: 1.65; }
      .prerender h1, .prerender h2, .prerender h3 { font-family: "Inter Tight", ui-sans-serif, system-ui, sans-serif; color: #f5f3ee; font-weight: 500; letter-spacing: -0.02em; }
      .prerender h1 { font-size: clamp(2.25rem, 6vw, 3.75rem); line-height: 1.02; margin: 0 0 1.25rem; }
      .prerender h2 { font-size: 1.05rem; margin: 3.5rem 0 1rem; padding-top: 1rem; border-top: 1px solid rgba(138, 133, 124, 0.12); font-family: "JetBrains Mono", ui-monospace, monospace; font-weight: 500; letter-spacing: 0.04em; color: #8a857c; text-transform: uppercase; }
      .prerender h3 { font-size: 1.0625rem; margin: 1.75rem 0 0.5rem; }
      .prerender p { margin: 0 0 0.85rem; }
      .prerender .pre-wordmark { font-family: "Inter Tight", ui-sans-serif, sans-serif; color: #f5f3ee; font-size: 1.0625rem; margin: 0; }
      .prerender .pre-eyebrow, .prerender .pre-note, .prerender .pre-period { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: #5e5a54; }
      .prerender .pre-eyebrow { margin: 0 0 3rem; }
      .prerender .pre-lede { font-size: 1.125rem; color: #8a857c; max-width: 42rem; }
      .prerender ul { padding-left: 1.15rem; margin: 0 0 1rem; }
      .prerender li { margin-bottom: 0.6rem; }
      .prerender strong { color: #f5f3ee; font-weight: 500; }
      .prerender a { color: #5e9e78; }
      .prerender .pre-timeline { list-style: none; padding-left: 0; }
      .prerender .pre-timeline li { border-left: 1px solid rgba(138, 133, 124, 0.12); padding-left: 1.25rem; margin-bottom: 1.5rem; }
      .prerender .pre-timeline h3 { margin-top: 0.25rem; }
      .prerender .pre-cta { display: inline-block; margin: 0.75rem 0.75rem 0 0; padding: 0.7rem 1.25rem; border-radius: 6px; background: #3f7d5c; color: #f5f3ee; text-decoration: none; font-weight: 500; }
      .prerender .pre-cta-ghost { background: transparent; color: #f5f3ee; box-shadow: inset 0 0 0 1px rgba(138, 133, 124, 0.28); }
    </style>`;

/* ── the card, at /card ────────────────────────────────────────────── */

/**
 * The contact card gets the same treatment for the same reason, plus one of
 * its own: one index.html serves all three hero-lab targets, so the card ships
 * with the page's title and the page's description and renames itself at
 * runtime (see Card.tsx). Anything reading the HTML got the wrong page's name.
 * Here the title and description are the card's before it is served.
 *
 * The Person record is the useful part: it is the one place on the site that
 * ties the name to every profile it appears under, which is what a search
 * engine and an AI agent both need to know they are reading about one person.
 */
function cardHead(d) {
  const { CARD, CALLS, SOCIALS } = d;
  /* the same string Card.tsx sets at runtime, so the tab a visitor sees and
     the title a crawler indexes are one title */
  const title = `${CARD.name} — contact`;
  const description = `Contact card for ${CARD.name}, ${CARD.role.replace(/ · /g, ', ')}, based in ${CARD.place}. Book a call, find me elsewhere, or send a message.`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: CARD.name,
    jobTitle: CARD.role,
    url: `${SITE}/card`,
    homeLocation: { '@type': 'Place', name: CARD.place },
    sameAs: SOCIALS.map((s) => s.href),
  };

  return {
    title,
    description,
    tags: `
    <!-- Injected at build time by scripts/prerender.mjs. -->
    <link rel="canonical" href="${SITE}/card" />
    <meta name="author" content="${esc(CARD.name)}" />
    <meta name="robots" content="index, follow" />

    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="${esc(CARD.name)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${SITE}/card" />

    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />

    <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
    </script>
${PRERENDER_CSS}
  `,
    body: `<main class="prerender">
        <p class="pre-eyebrow">Contact card</p>
        <h1>${esc(CARD.name)}</h1>
        <p class="pre-lede">${esc(CARD.role)}</p>
        <p class="pre-note">${esc(CARD.place)}</p>

        <h2>Book a call</h2>
        <ul>${CALLS.map(
          (c) =>
            `<li><a href="${esc(c.href)}"><strong>${esc(c.title)}</strong></a> — ${esc(c.minutes)} minutes. ${esc(c.note)}</li>`
        ).join('')}</ul>

        <h2>Elsewhere</h2>
        <ul>${SOCIALS.map(
          (s) => `<li><a href="${esc(s.href)}">${esc(s.name)}</a> — ${esc(s.handle)}</li>`
        ).join('')}</ul>

        <h2>The site</h2>
        <p><a href="${esc(CARD.site.href)}">${esc(CARD.site.label)}</a></p>
      </main>`,
  };
}

/* ── entry ─────────────────────────────────────────────────────────── */

/**
 * Both anchors are asserted rather than assumed. If the build output stops
 * looking the way this expects, the right outcome is a failed build with a
 * reason, not a deploy that silently goes back to shipping an empty page.
 */
const ROOT_DIV = /<div id="root">\s*<\/div>/;

function assertShape(html, what) {
  if (!ROOT_DIV.test(html)) {
    throw new Error(
      `prerender: no empty <div id="root"></div> in the built HTML for ${what}. ` +
        'The hero-lab build output changed shape — update scripts/prerender.mjs to match.'
    );
  }
  if (!html.includes('</head>')) {
    throw new Error(`prerender: no </head> in the built HTML for ${what}.`);
  }
}

const fill = (html, tags, main) =>
  html
    .replace('</head>', `${tags}</head>`)
    .replace(ROOT_DIV, `<div id="root">\n      ${main}\n    </div>`);

/** Returns the page's HTML with the head block and the body copy in it. */
export async function prerender(html, { root = process.cwd(), dist } = {}) {
  assertShape(html, 'the page');

  const content = await loadContent(root);
  const reviews = await loadReviewText(root);
  const portrait = dist ? await findPortrait(dist) : null;

  const description =
    html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] ??
    content.HERO.subtext;

  return fill(html, head(content, description, portrait), body(content, reviews));
}

/** Returns the card's HTML, retitled and with its own copy in it. */
export async function prerenderCard(html, { root = process.cwd() } = {}) {
  assertShape(html, 'the card');

  const d = await loadCard(root);
  const { title, description, tags, body: main } = cardHead(d);

  return fill(html, tags, main)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${esc(description)}" />`
    );
}
