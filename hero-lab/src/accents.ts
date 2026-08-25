export type Accent = {
  id: string;
  name: string;
  /** solid stand-in — every border, dot, and hairline still needs one colour */
  hex: string;
  /** optional gradient, used for text fills, the filled CTA, and marks */
  gradient?: string;
  /** the accent as type — lifted so it clears contrast on the dark ground.
   *  Fills keep `hex`; anything read as a word uses this. */
  text?: string;
};

export const GOLD_GRADIENT =
  "linear-gradient(135deg, #FBE9B0 0%, #E2C173 28%, #C9A24A 58%, #9A7328 100%)";

export const ACCENTS: Accent[] = [
  { id: "green", name: "deep green", hex: "#3F7D5C", text: "#5E9E78" },
  { id: "blue", name: "signal blue", hex: "#4A90E2" },
  { id: "red", name: "signal red", hex: "#D9382F" },
  { id: "gold", name: "gold gradient", hex: "#D8B25A", gradient: GOLD_GRADIENT },
  { id: "purple", name: "signal purple", hex: "#8B5CF6" },
];

const rgb = (hex: string) => {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ] as const;
};

const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** lighten toward white by t (0–1) — hover state for the filled button */
const lift = (hex: string, t = 0.14) => {
  const [r, g, b] = rgb(hex).map((v) => Math.round(v + (255 - v) * t));
  return `rgb(${r} ${g} ${b})`;
};

const alpha = (hex: string, a: number) => {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};


/** true when two accents read as the same colour on screen */
export function applyAccent(hex: string, gradient?: string, text?: string) {
  const root = document.documentElement.style;
  // fills use the accent as-is; type uses the lifted variant when one exists
  root.setProperty("--accent-text", text ?? hex);
  // gradient-aware elements read --accent-gradient; everything else stays solid
  root.setProperty("--accent-gradient", gradient ?? "none");
  document.documentElement.setAttribute("data-accent-gradient", gradient ? "on" : "off");
  root.setProperty("--accent-is-gradient", gradient ? "1" : "0");
  root.setProperty("--accent", hex);
  root.setProperty("--accent-soft", alpha(hex, 0.16));
  root.setProperty("--accent-line", alpha(hex, 0.28));
  root.setProperty("--accent-glowless", alpha(hex, 0.08));
  root.setProperty("--accent-hover", lift(hex));
  // text sitting on the filled accent button: whichever of ink/bone reads better
  const ink = "#0C0B0A";
  root.setProperty(
    "--accent-ink",
    contrast(hex, ink) >= contrast(hex, "#F5F3EE") ? ink : "#F5F3EE"
  );
}

export const STORAGE_KEY = "jtr-accent";
