export const EMAIL = "jt@jtylerray.com";

type Props = {
  /** show the mono descriptor next to the wordmark */
  descriptor?: boolean;
  /** pill-shaped nav CTA (Krea) vs 8px (brand guide) */
  pill?: boolean;
  wordmark?: boolean;
};

/** The nav CTA is the primary action, same treatment as the hero's. */
export default function Nav({ descriptor = true, pill = false, wordmark = true }: Props) {
  return (
    <nav className="nav rise rise-1">
      {wordmark && <span className="wordmark">J. Tyler Ray</span>}
      {descriptor && <span className="desc">Systems &amp; operations</span>}
      <span className="links">
        {/* secondary treatment: the hero's filled button is the only accent
            fill above the fold */}
        <a className={`btn btn-ghost nav-cta ${pill ? "pill" : ""}`} href={`mailto:${EMAIL}`}>
          Get in touch
        </a>
      </span>
    </nav>
  );
}
