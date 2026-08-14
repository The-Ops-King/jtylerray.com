import { useEffect, useState } from "react";
import "./scrollcue.css";

/**
 * The scroll cue: two chevrons, the lower one trailing the upper, cascading
 * downward on a slow loop.
 *
 * Two of them rather than one because a single mark reads as an ornament,
 * while a pair pointing the same way reads as a direction. It leaves for good
 * once the reader has moved — a cue that is still there after you have started
 * scrolling is telling you something you already know.
 *
 * On the card it is `fixed`, sitting on the bottom edge of the window, because
 * the card has no hero to hang it from.
 */
export default function ScrollCue({
  href,
  fixed = false,
  label = "Scroll down",
  delay = 3000,
}: {
  /** anchor to jump to; without one the cue is a mark, not a control */
  href?: string;
  fixed?: boolean;
  label?: string;
  /** how long the page gets to itself before the cue arrives, in ms */
  delay?: number;
}) {
  const [gone, setGone] = useState(false);
  /* The cue waits. Someone who lands and scrolls straight away never needed
     it, and a cue that is already there when the page opens is part of the
     furniture — arriving late is what makes it read as a prompt. */
  const [ready, setReady] = useState(delay === 0);
  // a cue on a page that does not scroll is a lie
  const [scrollable, setScrollable] = useState(!fixed);

  useEffect(() => {
    const check = () => {
      setScrollable(document.documentElement.scrollHeight > window.innerHeight + 80);
    };
    if (fixed) {
      check();
      window.addEventListener("resize", check, { passive: true });
      return () => window.removeEventListener("resize", check);
    }
  }, [fixed]);

  useEffect(() => {
    if (ready) return;
    const id = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(id);
  }, [ready, delay]);

  useEffect(() => {
    if (gone) return;
    const onScroll = () => {
      if (window.scrollY > 60) setGone(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [gone]);

  // nothing in the markup until it is due: no empty box, no hidden link in
  // the tab order for three seconds
  if (!scrollable || !ready) return null;

  const className = `scroll-cue${fixed ? " is-fixed" : ""}${gone ? " is-gone" : ""}`;
  const chevrons = (
    <>
      <Chevron className="cue-1" />
      <Chevron className="cue-2" />
    </>
  );

  if (!href) {
    return (
      <div className={className} aria-hidden="true">
        {chevrons}
      </div>
    );
  }

  return (
    <a className={className} href={href} aria-label={label} tabIndex={gone ? -1 : 0}>
      {chevrons}
    </a>
  );
}

function Chevron({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 9"
      width="16"
      height="9"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1.5 1.5 L8 7 L14.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
