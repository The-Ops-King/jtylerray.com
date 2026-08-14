/**
 * Section 04 — what people say, as the screenshots themselves.
 *
 * Retyped praise is a claim; a screenshot is a receipt, which is why these
 * are shown as they were captured rather than set as pull quotes. That does
 * mean two palettes on one wall: Slack and Messenger arrive dark, WhatsApp
 * and the rest arrive light. Each tile paints the ground its own screenshot
 * came on, so a light shot reads as a pinned artifact rather than as a hole
 * burned in the page.
 *
 * `alt` carries what the screenshot says, because a wall of images with no
 * text is a wall of nothing to a screen reader and to a search engine.
 *
 * `w` and `h` are the capture's real pixel size. Reviews.tsx packs the wall
 * from those ratios, so the layout follows the screenshots rather than the
 * screenshots being cropped to fit a layout.
 */

import adminNotes from "../assets/reviews/admin-notes.png";
import assassin from "../assets/reviews/assassin.png";
import betterThanJm from "../assets/reviews/better-than-jm.png";
import cheatCode from "../assets/reviews/cheat-code.png";
import devinPowerOutage from "../assets/reviews/devin-power-outage.png";
import leaderboardApproved from "../assets/reviews/leaderboard-approved.png";
import leaderboardHires from "../assets/reviews/leaderboard-hires.png";
import lightInTheDark from "../assets/reviews/light-in-the-dark.jpg";
import likeGold from "../assets/reviews/like-gold.png";
import niannOutbound from "../assets/reviews/niann-outbound.png";
import niannPipeline from "../assets/reviews/niann-pipeline.png";
import nyreeRecommendations from "../assets/reviews/nyree-recommendations.png";
import resultsOfTraining from "../assets/reviews/results-of-training.png";
import secondMentor from "../assets/reviews/second-mentor.png";
import zachAnyCloserRole from "../assets/reviews/zach-any-closer-role.jpg";

export type Review = {
  src: string;
  /** what the screenshot says, transcribed */
  alt: string;
  /** the ground the screenshot was captured on */
  tone: "dark" | "light";
  /** that ground's actual colour, sampled from the capture's own edge, so a
   *  strip padded out to a workable shape sits on its own background rather
   *  than in a box of some approximate grey */
  bg: string;
  /** intrinsic size, so the tile holds its place before the image loads */
  w: number;
  h: number;
};

export const REVIEWS: Review[] = [
  {
    src: devinPowerOutage,
    bg: "#282b2f",
    alt: "Slack core value shoutout from Devin Bray: Tyler and Brendan stepped up during a power outage, covering interviews and keeping candidates in the loop. Kate Enriquez replies, world class right there.",
    tone: "dark",
    w: 645,
    h: 434,
  },
  {
    src: nyreeRecommendations,
    bg: "#292c2f",
    alt: "Slack core value shoutout from Nyree Chupp: Tyler always delivers long lists of candidate recommendations when she is in a pinch, world class efforts getting candidates set up for success.",
    tone: "dark",
    w: 1168,
    h: 434,
  },
  {
    src: assassin,
    bg: "#f5f5f5",
    alt: "Message: Kate and I were talking about how much you crush it in your role on Monday. You are an assassin.",
    tone: "light",
    w: 567,
    h: 74,
  },
  {
    src: leaderboardApproved,
    bg: "#313337",
    alt: "Slack end-of-month leaderboard: Most Interviews Approved, Tyler Ray with 59.",
    tone: "dark",
    w: 570,
    h: 364,
  },
  {
    src: lightInTheDark,
    bg: "#252525",
    alt: "Messenger: Appreciate you Tyler. Thanks for being the light in the dark in the HTS space.",
    tone: "dark",
    w: 1080,
    h: 309,
  },
  {
    src: niannOutbound,
    bg: "#2a2e31",
    alt: "Slack core value shoutout from Niann Matson: Tyler started taking outbound interviews and has crushed it, his willingness to adapt and learn really shines through.",
    tone: "dark",
    w: 459,
    h: 243,
  },
  {
    src: betterThanJm,
    bg: "#e0e1e1",
    alt: "Facebook comment from Harinder Singh: J Tyler Ray is better than Jeremy Miner.",
    tone: "light",
    w: 377,
    h: 60,
  },
  {
    src: zachAnyCloserRole,
    bg: "#1e1f21",
    alt: "Messenger from Zach Brown: I think pretty much any closer role I would submit you for, that I have you that kind of G.",
    tone: "dark",
    w: 1080,
    h: 502,
  },
  {
    src: niannPipeline,
    bg: "#292c2f",
    alt: "Slack core value shoutout from Niann Matson: Tyler has been crushing it and helping the recruiting team wherever needed, posting copy for Polish-speaking reps and taking interviews to keep the pipeline stacked.",
    tone: "dark",
    w: 506,
    h: 178,
  },
  {
    src: resultsOfTraining,
    bg: "#d9dfd1",
    alt: "WhatsApp: honestly nice, Juraj caught on to me using AI for my notes and call flows and asked how I was getting as many hires as I was. This is now the results of your training.",
    tone: "light",
    w: 490,
    h: 79,
  },
  {
    src: secondMentor,
    bg: "#f0f0f0",
    alt: "WhatsApp: Honestly, could replace even needing a second mentor.",
    tone: "light",
    w: 471,
    h: 72,
  },
  {
    src: leaderboardHires,
    bg: "#323235",
    alt: "Slack recruiting leaderboard: Most RC Hires, Tyler Ray with 21.",
    tone: "dark",
    w: 603,
    h: 184,
  },
  {
    src: adminNotes,
    bg: "#dae3d5",
    alt: "WhatsApp: dude it's the only way. With how much they expect out of us, no way am I spending hours doing admin notes.",
    tone: "light",
    w: 531,
    h: 98,
  },
  {
    src: likeGold,
    bg: "#e9eaeb",
    alt: "WhatsApp: oh yeah, absolutely not, I'm holding onto this thing like gold.",
    tone: "light",
    w: 501,
    h: 72,
  },
  {
    src: cheatCode,
    bg: "#e0e1e3",
    alt: "Message: But real talk it's your prompt. As long as I have a structured call, make a few mistakes and fix it, it's a cheat code.",
    tone: "light",
    w: 452,
    h: 61,
  },
];
