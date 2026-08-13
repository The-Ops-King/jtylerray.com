import { useEffect, useState } from "react";
import { ACCENTS, STORAGE_KEY, applyAccent } from "./accents";
import { STYLES, STYLE_KEY, type StyleDef } from "./styles";
import { COPY, COPY_KEY } from "./copy";
import { CopyContext } from "./components/CopyContext";
import V1Rail from "./variants/V1Rail";
import L2Portrait from "./variants/L2Portrait";
import L3Mark from "./variants/L3Mark";
import V4Ledger from "./variants/V4Ledger";
import V5Index from "./variants/V5Index";
import V2Stage from "./variants/V2Stage";
import V3Panel from "./variants/V3Panel";
import V6Signal from "./variants/V6Signal";
import L9Bleed from "./variants/L9Bleed";
import L10Cover from "./variants/L10Cover";
import L11Atlas from "./variants/L11Atlas";

/**
 * The exploration lab: every dimension we tried, switchable. Shipped at
 * /brand-1. The decided hero lives in App.tsx and ships at /new-home.
 */
const LAYOUT_KEY = "jtr-layout";
const MARK_KEY = "jtr-mark";
const EYEBROW_KEY = "jtr-eyebrow";
const SCAN_KEY = "jtr-scan";

const LAYOUTS: { id: string; name: string; render: (s: StyleDef) => React.JSX.Element }[] = [
  { id: "rail", name: "rail", render: (s) => <V1Rail style={s} /> },
  { id: "bleed", name: "bleed", render: (s) => <L9Bleed style={s} /> },
  { id: "portrait", name: "portrait", render: (s) => <L2Portrait style={s} /> },
  { id: "mark", name: "mark", render: (s) => <L3Mark style={s} /> },
  { id: "panel", name: "panel", render: (s) => <V3Panel style={s} /> },
  { id: "ledger", name: "ledger", render: (s) => <V4Ledger style={s} /> },
  { id: "index", name: "index", render: (s) => <V5Index style={s} /> },
  { id: "stage", name: "stage", render: (s) => <V2Stage style={s} /> },
  { id: "signal", name: "signal", render: (s) => <V6Signal style={s} /> },
  { id: "cover", name: "cover", render: (s) => <L10Cover style={s} /> },
  { id: "atlas", name: "atlas", render: (s) => <L11Atlas style={s} /> },
];

const MARKS = [
  { id: "rule", name: "underline" },
  { id: "color", name: "text color" },
  { id: "wash", name: "highlight" },
  { id: "echo", name: "duplicate" },
  { id: "italic", name: "italic" },
  { id: "bracket", name: "bracket" },
  { id: "box", name: "box" },
];

const EYEBROWS = [
  { id: "rule", name: "rule" },
  { id: "underscore", name: "underscore" },
  { id: "plate", name: "plate" },
  { id: "wide", name: "wide" },
  { id: "slash", name: "slashes" },
  { id: "pill", name: "pill" },
  { id: "bracket", name: "bracket" },
  { id: "trail", name: "trailing" },
  { id: "bar", name: "bar" },
  { id: "plainer", name: "plain" },
];

/** read a stored choice, falling back when the option no longer exists */
function stored(key: string, options: { id: string }[], fallback: string) {
  const v = localStorage.getItem(key);
  return v && options.some((o) => o.id === v) ? v : fallback;
}

export default function Lab() {
  const [styleId, setStyleId] = useState(() => stored(STYLE_KEY, STYLES, STYLES[0].id));
  const [layoutId, setLayoutId] = useState(() => stored(LAYOUT_KEY, LAYOUTS, LAYOUTS[0].id));
  const [copyId, setCopyId] = useState(() => stored(COPY_KEY, COPY, COPY[0].id));
  const [markId, setMarkId] = useState(() => stored(MARK_KEY, MARKS, MARKS[1].id));
  const [eyebrowId, setEyebrowId] = useState(() => stored(EYEBROW_KEY, EYEBROWS, EYEBROWS[1].id));
  const [scan, setScan] = useState(() => localStorage.getItem(SCAN_KEY) !== "off");

  const style = STYLES.find((s) => s.id === styleId)!;
  const layout = LAYOUTS.find((l) => l.id === layoutId)!;
  const copy = COPY.find((c) => c.id === copyId)!;

  // Accent is chosen once and holds across every other switch.
  const [accent, setAccent] = useState(() => stored(STORAGE_KEY, ACCENTS, STYLES[0].defaultAccent));

  useEffect(() => {
    document.documentElement.setAttribute("data-style", style.id);
    localStorage.setItem(STYLE_KEY, style.id);
  }, [style.id]);

  useEffect(() => localStorage.setItem(LAYOUT_KEY, layout.id), [layout.id]);
  useEffect(() => localStorage.setItem(COPY_KEY, copy.id), [copy.id]);
  useEffect(() => localStorage.setItem(MARK_KEY, markId), [markId]);
  useEffect(() => localStorage.setItem(EYEBROW_KEY, eyebrowId), [eyebrowId]);
  useEffect(() => localStorage.setItem(SCAN_KEY, scan ? "on" : "off"), [scan]);

  useEffect(() => {
    const a = ACCENTS.find((x) => x.id === accent) ?? ACCENTS[0];
    applyAccent(a.hex, a.gradient);
    localStorage.setItem(STORAGE_KEY, accent);
  }, [accent]);

  const rows: { label: string; options: { id: string; name: string }[]; on: string; set: (id: string) => void }[] = [
    { label: "style", options: STYLES, on: styleId, set: setStyleId },
    { label: "layout", options: LAYOUTS, on: layoutId, set: setLayoutId },
    { label: "copy", options: COPY, on: copyId, set: setCopyId },
    { label: "mark", options: MARKS, on: markId, set: setMarkId },
    { label: "eyebrow", options: EYEBROWS, on: eyebrowId, set: setEyebrowId },
    {
      label: "motion",
      options: [
        { id: "off", name: "none" },
        { id: "on", name: "scan line" },
      ],
      on: scan ? "on" : "off",
      set: (id) => setScan(id === "on"),
    },
  ];

  return (
    <>
      <CopyContext.Provider value={copy}>
        <div
          key={`${style.id}-${layout.id}-${copy.id}`}
          data-mark={markId}
          data-eyebrow={eyebrowId}
        >
          {layout.render(style)}
          {scan && <div className="scanline" aria-hidden="true" />}
        </div>
      </CopyContext.Provider>

      <div className="switcher lab">
        <div className="switcher-row">
          <span className="group-label mono">color</span>
          <span className="row-items swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                className="swatch"
                title={`${a.name} · ${a.hex}`}
                aria-label={a.name}
                data-on={a.id === accent}
                style={{ "--sw": a.hex, "--sw-image": a.gradient ?? "none" } as React.CSSProperties}
                onClick={() => setAccent(a.id)}
              />
            ))}
          </span>
        </div>

        {rows.map((r) => (
          <div className="switcher-row" key={r.label}>
            <span className="group-label mono">{r.label}</span>
            <span className="row-items">
              {r.options.map((o) => (
                <button key={o.id} data-on={o.id === r.on} onClick={() => r.set(o.id)}>
                  {o.name}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
