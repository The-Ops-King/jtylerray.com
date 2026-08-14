import { useEffect, useMemo, useRef, useState } from "react";
import "./routing.css";

/**
 * Lead routing, as a working miniature.
 *
 * The graph is real logic, not a picture of one: the route is computed from
 * the two toggles, the dot walks the computed path, and the nodes light as it
 * reaches them. Change a toggle and the path changes, because the rules
 * decide the path.
 *
 * Documented accent exception (page spec 01): inside this demo forest means
 * live, and several nodes may carry it at once. Nowhere else on the page.
 */

type NodeId =
  | "in"
  | "score"
  | "route"
  | "repA"
  | "repB"
  | "repC"
  | "nurture"
  | "sms"
  | "cal"
  | "logged";

type Node = { id: NodeId; label: string; x: number; y: number };

const W = 124;
const H = 42;

/* One line of travel, left to right. The rep pool fans out of ROUTE and back
   into the follow-up, which is the shape the system actually has. Nurture
   hangs below the pool: it is where a cold lead stops. */
const NODES: Node[] = [
  { id: "in", label: "Lead in", x: 0, y: 70 },
  { id: "score", label: "Score", x: 140, y: 70 },
  { id: "route", label: "Route", x: 280, y: 70 },
  { id: "repA", label: "Rep A", x: 430, y: 0 },
  { id: "repB", label: "Rep B", x: 430, y: 70 },
  { id: "repC", label: "Rep C", x: 430, y: 140 },
  { id: "nurture", label: "Nurture", x: 430, y: 226 },
  { id: "sms", label: "SMS fires", x: 600, y: 70 },
  { id: "cal", label: "Calendar hold", x: 745, y: 70 },
  { id: "logged", label: "Logged", x: 890, y: 70 },
];

const byId = (id: NodeId) => NODES.find((n) => n.id === id)!;
const centre = (id: NodeId) => {
  const n = byId(id);
  return { x: n.x + W / 2, y: n.y + H / 2 };
};

const REPS: NodeId[] = ["repA", "repB", "repC"];

type Source = "paid" | "organic";
type Band = "hot" | "cold";

/**
 * The routing rules, stated once and used for both the drawn path and the
 * travelling dot.
 *
 * cold      → nurture, never a rep
 * paid+hot  → rep, SMS immediately, then the calendar hold
 * organic   → rep, into the calendar hold without the instant SMS
 */
function route(source: Source, band: Band, repIndex: number): NodeId[] {
  if (band === "cold") return ["in", "score", "route", "nurture"];
  const rep = REPS[repIndex % REPS.length];
  return source === "paid"
    ? ["in", "score", "route", rep, "sms", "cal", "logged"]
    : ["in", "score", "route", rep, "cal", "logged"];
}

/** an orthogonal run between two nodes: out the right edge, across at the
 *  midpoint, and in at the left edge. Every connection on the graph is this
 *  shape, so nothing ever doubles back across the drawing. */
function leg(from: NodeId, to: NodeId) {
  const a = byId(from);
  const b = byId(to);
  const start = { x: a.x + W, y: a.y + H / 2 };
  const end = { x: b.x, y: b.y + H / 2 };
  const midX = (start.x + end.x) / 2;
  return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
}

type Pt = { x: number; y: number };

/** the full polyline for a route, plus the distance at which each node is
 *  reached, so lighting and travel share one source of truth */
function buildPath(ids: NodeId[]) {
  const pts: Pt[] = [centre(ids[0])];
  const arrival: number[] = [0];

  for (let i = 0; i < ids.length - 1; i++) {
    const run = leg(ids[i], ids[i + 1]);
    pts.push(...run, centre(ids[i + 1]));
    arrival.push(-1); // filled once lengths are known
  }

  const lens: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    lens.push(total);
  }

  // each node centre is every 6th point: start, then 5 per leg
  const at: number[] = [0];
  for (let i = 1; i < ids.length; i++) at.push(lens[i * 6]);

  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  return { pts, lens, total, at, d };
}

function pointAt(pts: Pt[], lens: number[], dist: number): Pt {
  if (dist <= 0) return pts[0];
  if (dist >= lens[lens.length - 1]) return pts[pts.length - 1];
  let i = 1;
  while (lens[i] < dist) i++;
  const t = (dist - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
  return {
    x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
    y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
  };
}

const TRAVEL = 5000; // ms end to end, whatever the route measures
const DECAY = 1200; // ms for a lit node to fall back to grey

export default function RoutingDemo() {
  const [source, setSource] = useState<Source>("paid");
  const [band, setBand] = useState<Band>("hot");
  const [repIndex, setRepIndex] = useState(0);
  const [still, setStill] = useState(false);

  const wrap = useRef<HTMLDivElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const nodes = useRef(new Map<NodeId, SVGGElement | null>());

  const ids = useMemo(() => route(source, band, repIndex), [source, band, repIndex]);
  const path = useMemo(() => buildPath(ids), [ids]);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // the loop: runs only while the section is on screen
  useEffect(() => {
    if (still) return;
    const el = wrap.current;
    if (!el) return;

    let raf = 0;
    let start = 0;
    // when each node was last reached, so it can decay behind the lead
    const lit = new Map<NodeId, number>();
    // reached this cycle already: without this a passed node is re-lit every
    // frame and never decays
    const passed = new Set<NodeId>();

    const frame = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;

      // end of a cycle: advance the round robin, which restarts this effect
      if (elapsed >= TRAVEL) {
        setRepIndex((i) => i + 1);
        return;
      }

      const dist = (elapsed / TRAVEL) * path.total;
      const p = pointAt(path.pts, path.lens, dist);
      dot.current?.setAttribute("cx", String(p.x));
      dot.current?.setAttribute("cy", String(p.y));

      ids.forEach((id, i) => {
        if (dist >= path.at[i] && !passed.has(id)) {
          passed.add(id);
          lit.set(id, now);
        }
      });
      NODES.forEach((n) => {
        const since = lit.has(n.id) ? now - lit.get(n.id)! : Infinity;
        const v = since >= DECAY ? 0 : 1 - since / DECAY;
        nodes.current.get(n.id)?.style.setProperty("--lit", v.toFixed(3));
      });

      raf = requestAnimationFrame(frame);
    };

    // the loop only runs while the section is on screen
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !raf) {
          start = 0;
          raf = requestAnimationFrame(frame);
        }
        if (!entry.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ids, path, still]);

  // static fallback: the current route is simply lit, no dot, no loop
  useEffect(() => {
    if (!still) return;
    NODES.forEach((n) =>
      nodes.current.get(n.id)?.style.setProperty("--lit", ids.includes(n.id) ? "1" : "0")
    );
  }, [ids, still]);

  return (
    <div className="routing" ref={wrap}>
      {/* the graph keeps its own scroll on a narrow screen rather than
          shrinking the labels out of legibility */}
      <div className="routing-frame">
      <svg viewBox="0 0 1024 280" className="routing-svg" role="img" aria-label="Lead routing diagram">
        {/* the connectors this rule set can use, drawn grey and left grey */}
        <g className="wires">
          {wires(source).map((w) => (
            <path key={w} d={w} />
          ))}
        </g>

        {/* the active route, and the lead travelling it */}
        <path className="wire-live" d={path.d} />
        {!still && <circle ref={dot} className="dot" r="4" cx={centre("in").x} cy={centre("in").y} />}

        {NODES.map((n) => (
          <g
            key={n.id}
            className="node"
            ref={(el) => {
              nodes.current.set(n.id, el);
            }}
          >
            <rect className="node-base" x={n.x} y={n.y} width={W} height={H} rx="6" />
            <rect className="node-live" x={n.x} y={n.y} width={W} height={H} rx="6" />
            <text className="node-label" x={n.x + 14} y={n.y + H / 2 + 4}>
              {n.label}
            </text>
            <text className="node-label node-label-live" x={n.x + 14} y={n.y + H / 2 + 4}>
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      </div>

      <div className="routing-controls">
        <button
          className="routing-btn mono"
          /* a fresh lead: restarts the walk and hands it to the next rep */
          onClick={() => setRepIndex((i) => i + 1)}
        >
          Inject lead
        </button>

        <Toggle
          label="Source"
          value={source}
          options={["paid", "organic"]}
          onChange={(v) => setSource(v as Source)}
        />
        <Toggle
          label="Score"
          value={band}
          options={["hot", "cold"]}
          onChange={(v) => setBand(v as Band)}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="toggle">
      <span className="mono toggle-label">{label}</span>
      <div className="toggle-set">
        {options.map((o) => (
          <button
            key={o}
            className="mono toggle-opt"
            data-on={o === value}
            onClick={() => onChange(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The grey substrate: every connector available under the current source
 * rule. Paid leads leave a rep through the SMS, organic leads go straight to
 * the calendar hold, so only one of those two fans is ever drawn. Drawing
 * both at once boxes the SMS node in and reads as a container.
 */
function wires(source: Source) {
  const followUp: NodeId = source === "paid" ? "sms" : "cal";
  const pairs: [NodeId, NodeId][] = [
    ["in", "score"],
    ["score", "route"],
    ["route", "repA"],
    ["route", "repB"],
    ["route", "repC"],
    ["route", "nurture"],
    ["repA", followUp],
    ["repB", followUp],
    ["repC", followUp],
    ["sms", "cal"],
    ["cal", "logged"],
  ];
  return pairs.map(([a, b]) => {
    const run = [centre(a), ...leg(a, b), centre(b)];
    return run.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  });
}
