import { useRef } from "react";
import GridBackdrop from "../components/GridBackdrop";
import ScrollCue from "../components/ScrollCue";
import Proof, { HAS_PROOF } from "../components/Proof";
import { motion, useScroll, useTransform } from "framer-motion";
import SmoothScroll from "./SmoothScroll";
import portrait from "../assets/suit.jpeg";
import {
  CONTACT,
  CONTACT_URL,
  EMAIL,
  HERO,
  POV,
  RAIL,
  TIMELINE,
  WHAT_I_DO,
} from "./content";
import WorkSuite from "./WorkSuite";
import DriftWall from "./DriftWall";
import Reviews from "./Reviews";
import "./site.css";

/**
 * The page, as a technical drawing. Four sections under the hero, each
 * answering one question in the order the reader has it.
 *
 * Structure is grey, always: grid, ticks, rules, index numerals, the register
 * and the timeline datum. Accent is content only, two elements a viewport.
 *
 * The branding dimensions are the lab's, fixed here rather than switchable:
 * mark = text colour, eyebrow = wide, motion = the scan line along the bottom
 * edge. The style (blueprint) is set on <html> in App.tsx.
 */
export default function Site() {
  return (
    <div className="site" data-mark="color" data-eyebrow="wide">
      <SmoothScroll />
      <Hero />
      <Argument />
      <WhatIDo />
      <Work />
      <WhoIAm />
      <WhatPeopleSay />
      <Contact />
      <Footer />
      <div className="scanline" aria-hidden="true" />
    </div>
  );
}

/* ── shared ────────────────────────────────────────────────────────── */

function SectionLabel({ n, children }: { n: string; children: string }) {
  return (
    <div className="section-label">
      <hr className="section-rule" />
      <span className="mono">
        {n} · {children}
      </span>
    </div>
  );
}

/** The section CTA is the primary button, filled in the accent. It is the
 *  same ask as the hero's, so it is drawn the same way. */
function CtaLink({ children = "Fix your systems" }: { children?: string }) {
  return (
    <a className="btn btn-fill cta-btn" href={CONTACT_URL}>
      {children}
    </a>
  );
}

/* ── hero ──────────────────────────────────────────────────────────── */

function Hero() {
  const [head, mark, tail] = HERO.headline;
  return (
    <section className="hero" id="top">
      <GridBackdrop cell={48} crosshairs={4} drift={14} ticks />
      <Corners />
      <div className="shell">
        <header className="masthead">
          <a className="wordmark-block" href="#top">
            <span className="wordmark">J. Tyler Ray</span>
            <span className="mono descriptor">Systems &amp; Operations</span>
          </a>
          <nav className="masthead-nav">
            <a href="#work">Work</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <a className="btn btn-outline" href={CONTACT_URL}>
              Fix your systems
            </a>
          </nav>
        </header>

        <div className="hero-body v1-body">
          <div className="hero-copy v1-left" data-lens-guard>
            <p className="eyebrow rise rise-1">{HERO.eyebrow}</p>
            <h1 className="display rise rise-2">
              {head}
              <span className="mark">{mark}</span>
              {tail}
            </h1>
            <p className="lede rise rise-3">{HERO.subtext}</p>
            <div className="btns rise rise-4">
              <a className="btn btn-fill" href={CONTACT_URL}>
                Fix your systems
              </a>
              <a className="btn btn-outline" href="#work">
                See the work
              </a>
            </div>
          </div>
          {/* the rail: the five things I build, on a grey datum. It steps
              aside for a real screenshot the day one exists. */}
          {HAS_PROOF ? (
            <Proof />
          ) : (
            <aside className="v1-rail rise rise-4">
              {RAIL.map((row, i) => (
                <div className="v1-row" key={row.label}>
                  <span className="v1-idx mono">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="v1-k">{row.label}</div>
                    <div className="v1-t mono">{row.sub}</div>
                  </div>
                </div>
              ))}
            </aside>
          )}
        </div>
      </div>
      <ScrollCue href="#what" label="Scroll to what I do" />
    </section>
  );
}

/** Hairline registration at the four hero corners, held to the hero so the
 *  frame opens the page instead of following the reader down it. */
function Corners() {
  return (
    <div className="corners" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

/* ── the argument ──────────────────────────────────────────────────── */

/** The thesis, between the hero and the numbered sections.
 *
 * It carries no index numeral on purpose. The register from 01 to 05 answers
 * questions about me; this answers the one the reader arrived with, so
 * numbering it would file it as another section about the work.
 */
function Argument() {
  return (
    <section className="section pov" id="why">
      <div className="col">
        <h2 className="display pov-head">{POV.headline}</h2>
        <div className="prose pov-prose">
          {POV.prose.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </div>
        <p className="mono pov-sym-head">{POV.symptomsHead}</p>
        <ul className="pov-sym">
          {POV.symptoms.map((sym) => (
            <li key={sym}>{sym}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 01 ────────────────────────────────────────────────────────────── */

/** How the work gets done, not what gets built: the rail said that already.
 *  No CTA here, the reader should carry straight into 02. */
function WhatIDo() {
  return (
    <section className="section" id="what">
      <div className="col">
        <SectionLabel n="01">What I do</SectionLabel>
        <div className="what-grid">
          <div className="prose">
            {WHAT_I_DO.prose.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>
          {/* what it is all built on, drifting rather than listed. The slot
              takes its height from the prose beside it; the wall fills the
              slot absolutely, so its own tiles never size the section. */}
          <div className="wall-slot">
            <DriftWall />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 02 ────────────────────────────────────────────────────────────── */

/** Section 02, in five switchable layouts. See WorkSuite.tsx. */
function Work() {
  return (
    <section className="section work" id="work">
      <div className="col">
        <WorkSuite />
        <CtaLink />
      </div>
    </section>
  );
}

/* ── 03 ────────────────────────────────────────────────────────────── */

function WhoIAm() {
  return (
    <section className="section about" id="about">
      {/* Desktop: the portrait holds the full height of the plate and bleeds
          off the right edge, and the timeline is drawn to match it.

          Narrow: there is no right edge to bleed into, so it stops being a
          field behind the text and becomes a picture below it — which is why
          it carries alt text rather than aria-hidden. A decorative bleed and
          a portrait of me are not the same element to a screen reader. */}
      <figure className="about-bleed">
        <img src={portrait} alt="J. Tyler Ray" />
      </figure>
      <div className="col about-col">
        <SectionLabel n="03">Who I am</SectionLabel>
        <Timeline />
      </div>
    </section>
  );
}

/** A drawing's revision column, vertical: a datum line that draws downward as
 *  the section arrives, with a survey marker at each entry. Renders fully
 *  drawn under prefers-reduced-motion. */
function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "center center"],
  });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div className="timeline" ref={ref}>
      <div className="timeline-track" aria-hidden="true">
        <motion.span className="timeline-rule" style={{ height }} />
      </div>
      {TIMELINE.map((e, i) => (
        <div className="era" data-side={i % 2 === 0 ? "left" : "right"} key={e.period}>
          <span className="era-node" aria-hidden="true" />
          <span className="era-tick" aria-hidden="true" />
          <div className="era-body">
            <p className="era-period mono">{e.period}</p>
            <h3 className="era-title">{e.title}</h3>
            <p className="era-line">{e.line}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 04 ────────────────────────────────────────────────────────────── */

/** The receipts, below the timeline: the section says what I did, this says
 *  what it looked like from the other side of it. Screenshots as captured —
 *  see reviews.ts for why they are not set as pull quotes. */
function WhatPeopleSay() {
  return (
    <section className="section says" id="says">
      <div className="col">
        <SectionLabel n="04">What people say</SectionLabel>
        <Reviews />
      </div>
    </section>
  );
}

/* ── 05 ────────────────────────────────────────────────────────────── */

function Contact() {
  return (
    <section className="section contact" id="contact">
      <div className="col">
        <SectionLabel n="05">Get in touch</SectionLabel>
        <h2 className="display contact-head">{CONTACT.headline}</h2>
        <p className="lede">{CONTACT.line}</p>
        {/* one wording for every ask on the page */}
        <a className="btn btn-fill" href={CONTACT_URL}>
          Fix your systems
        </a>
        {/* not everyone books a call, and they should not have to */}
        <p className="contact-email">{EMAIL}</p>
        {/* who this is sized for, so the wrong enquiry can rule itself out
            before it reaches the calendar */}
        <p className="contact-qualifier">{CONTACT.qualifier}</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="col foot-in">
        <span>J. Tyler Ray</span>
        <span className="mono">Systems &amp; Operations</span>
        <span className="mono">2026</span>
      </div>
    </footer>
  );
}
