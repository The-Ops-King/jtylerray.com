import { useRef, useState } from "react";
import { TESTIMONIALS, type Testimonial } from "./content";
import "./videosay.css";

/**
 * The recorded testimonials, above the screenshot receipts in 05.
 *
 * Nothing loads until it is asked for. preload="none" means the poster is
 * all that is fetched, and the file itself only arrives when somebody presses
 * play: two videos nobody watches would otherwise be the heaviest thing on a
 * page whose whole point was being light.
 *
 * Nothing plays on its own, and nothing makes a sound until it is asked to.
 * An autoplaying voice on a page somebody just opened is the fastest way to
 * lose them, and muting it instead leaves a testimonial nobody can hear.
 */
export default function VideoSay() {
  return (
    <div className="vsay">
      {TESTIMONIALS.map((t) => (
        <Card key={t.name} t={t} />
      ))}
    </div>
  );
}

function Card({ t }: { t: Testimonial }) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  /* The video is always mounted and play() is called straight out of the
     click. Mounting it on the press instead and playing a frame later cost
     the user gesture, and a browser will not start an unmuted video without
     one: the first press did nothing and it took a second one to play. */

  return (
    <figure className="vsay-card">
      <div className="vsay-frame">
        <video
          ref={ref}
          className="vsay-video"
          src={t.video}
          poster={t.poster}
          controls={started}
          playsInline
          preload="none"
          onPlay={() => setStarted(true)}
        />
        {!started && (
          <button
            type="button"
            className="vsay-play"
            onClick={() => ref.current?.play().catch(() => setStarted(true))}
          >
            <span className="vsay-scrim" aria-hidden="true" />
            <span className="vsay-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            </span>
            <span className="vsay-cta mono">
              Play {t.name}
              <span className="sr-only"> testimonial</span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="vsay-body">
        <p className="vsay-who">
          <span className="vsay-name">{t.name}</span>
          <span className="mono vsay-org">{t.org}</span>
        </p>
        <p className="vsay-blurb">{t.blurb}</p>
      </figcaption>
    </figure>
  );
}
