import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth scroll, from 21st.dev (UI Layouts, "Smooth Scroll"), which is a
 * Lenis wrapper. Kept as a frame around the real page: it adds no element,
 * no widget, and nothing to look at. It changes how the page moves under the
 * reader, which is the whole of it.
 *
 * Anchor clicks are handed to Lenis so the scroll cue and the nav ease to
 * their target instead of jumping.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      // long, shallow ease out. Nothing overshoots and nothing floats.
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });

    let raf = 0;
    const frame = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.('a[href^="#"]');
      const id = link?.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: 0 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
