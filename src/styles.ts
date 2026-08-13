import { GOLD_GRADIENT } from "./accents";

export type BackdropMode = "grid" | "flat" | "frame" | "aurora" | "rule" | "halo";

export type StyleDef = {
  id: string;
  /** shown in the switcher */
  name: string;
  /** one-line reminder of the source language */
  note: string;
  /** accent preset seeded on first visit — a chosen accent always wins */
  defaultAccent: string;
  /** native accent is a gradient (solid accent stays the fallback colour) */
  accentGradient?: string;
  backdrop: BackdropMode;
  /** draw the measurement marks: ruler ticks + corner crop marks */
  marks?: boolean;
  /** backdrop tuning */
  cell?: number;
  crosshairs?: number | false;
  drift?: number;
};

export const STYLES: StyleDef[] = [
  {
    id: "blueprint",
    name: "blueprint",
    note: "house style — graph paper, ruler ticks, corner crop marks",
    defaultAccent: "green",
    backdrop: "grid",
    marks: true,
    cell: 48,
    crosshairs: 4,
    drift: 14,
  },
  {
    id: "clean",
    name: "clean",
    note: "same sheet, no measurement marks — grid and nodes only",
    defaultAccent: "green",
    backdrop: "grid",
    marks: false,
    cell: 48,
    crosshairs: 4,
    drift: 14,
  },
  {
    id: "obsidian",
    name: "obsidian",
    note: "Atoms — cream on black, gold gradient, 4px hairline frames",
    defaultAccent: "gold",
    accentGradient: GOLD_GRADIENT,
    backdrop: "frame",
    marks: false,
  },
  {
    id: "console",
    name: "console",
    note: "Better Stack — midnight SRE console, steel hairlines, rim-lit pills",
    defaultAccent: "blue",
    backdrop: "grid",
    marks: false,
    cell: 64,
    crosshairs: false,
    drift: 10,
  },
  {
    id: "meridian",
    name: "meridian",
    note: "original — instrument panel: 2px corners, ruled sheet, Geist",
    defaultAccent: "blue",
    backdrop: "rule",
    marks: true,
    cell: 32,
    drift: 10,
  },
  {
    id: "forge",
    name: "forge",
    note: "original — warm graphite, Sora, 12px radii, one overhead light",
    defaultAccent: "gold",
    accentGradient: GOLD_GRADIENT,
    backdrop: "halo",
    marks: false,
    cell: 96,
    drift: 18,
  },
];

export const STYLE_KEY = "jtr-style";
