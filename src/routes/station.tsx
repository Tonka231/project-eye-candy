import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";

export const Route = createFileRoute("/station")({
  head: () => ({
    meta: [
      { title: "ULTRON-08 — Dark Station" },
      {
        name: "description",
        content:
          "Top-down agent station. Rooms are agents, corridors are messages, light beads are hand-offs. Phase 1: simulated event stream.",
      },
    ],
  }),
  component: Station,
});

/* ───────────────────────── palette (video match — MATRIX-GREEN) ─────────── */
// `sith` is repurposed as the primary terminal-green accent so all the HUD / UI
// references stay valid while the whole interface reads green like the clip.
const C = {
  void: "#04050a",
  hull: "#0a0f0c",
  sith: "#39ff9c", // primary terminal green (HUD, accents, commander)
  green: "#39ff9c",
  cyan: "#3fe0d0", // unified room frames
  yellow: "#ffd23f", // corner brackets
  scan: "#ff3347", // red scan beams
  ember: "#ff7a4d",
  amber: "#ffb347",
  ash: "#566058",
  bone: "#cde0d4",
  steel: "#4aa3ff",
  violet: "#a86bff",
  toxic: "#57e08a",
  deep: "#ff2f52",
} as const;

// Every room shares the same cyan frame in the video; the interior/glow is tinted.
const EDGE = C.cyan;

/* ───────────────────────────── logical canvas ──────────────────────────── */
const W = 640;
const H = 400;

type Theme = keyof typeof ROOM_THEME;
// Each room keeps the shared cyan frame (EDGE) but glows in its own tint.
const ROOM_THEME = {
  green: { tint: C.green, floor: "#07130c" },
  ember: { tint: C.ember, floor: "#170d08" },
  amber: { tint: C.amber, floor: "#161006" },
  steel: { tint: C.steel, floor: "#08111f" },
  violet: { tint: C.violet, floor: "#120a1f" },
  toxic: { tint: C.toxic, floor: "#08160f" },
  deep: { tint: C.deep, floor: "#170709" },
} as const;

interface Room {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  theme: Theme;
  boss?: boolean;
  crew: number;
}

// The 10 science-crew agents laid out around a central COMMANDER (boss).
const ROOMS: Room[] = [
  {
    id: "cmd",
    label: "COMMANDER",
    x: 248,
    y: 150,
    w: 150,
    h: 112,
    theme: "green",
    boss: true,
    crew: 2,
  },
  { id: "resA", label: "RECHERCHE α", x: 22, y: 26, w: 122, h: 94, theme: "steel", crew: 3 },
  { id: "resB", label: "RECHERCHE β", x: 22, y: 154, w: 122, h: 94, theme: "violet", crew: 3 },
  { id: "resG", label: "RECHERCHE γ", x: 22, y: 282, w: 122, h: 94, theme: "steel", crew: 3 },
  { id: "fact", label: "FAKTENCHECK", x: 176, y: 24, w: 120, h: 86, theme: "amber", crew: 2 },
  { id: "confl", label: "WIDERSPRUCH", x: 364, y: 24, w: 120, h: 86, theme: "deep", crew: 2 },
  { id: "synth", label: "SYNTHESE", x: 502, y: 96, w: 116, h: 92, theme: "green", crew: 2 },
  { id: "crit", label: "KRITIKER", x: 502, y: 224, w: 116, h: 92, theme: "toxic", crew: 2 },
  { id: "cite", label: "ZITATION", x: 364, y: 302, w: 120, h: 74, theme: "amber", crew: 2 },
  { id: "rep", label: "REPORT", x: 182, y: 302, w: 120, h: 74, theme: "ember", crew: 3 },
];
const ROOM = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<string, Room>;
const cx = (r: Room) => r.x + r.w / 2;
const cy = (r: Room) => r.y + r.h / 2;

// Corridors: commander is the hub, plus the review pipeline down the sides.
const EDGES: [string, string][] = [
  ["cmd", "resA"],
  ["cmd", "resB"],
  ["cmd", "resG"],
  ["cmd", "fact"],
  ["cmd", "confl"],
  ["cmd", "synth"],
  ["cmd", "crit"],
  ["cmd", "cite"],
  ["cmd", "rep"],
  ["resA", "fact"],
  ["fact", "confl"],
  ["synth", "crit"],
  ["cite", "rep"],
];

// L-shaped path between two room centres (elbow at target.x / source.y).
function pathOf(a: Room, b: Room): [number, number][] {
  return [
    [cx(a), cy(a)],
    [cx(b), cy(a)],
    [cx(b), cy(b)],
  ];
}
function edgePath(from: string, to: string): [number, number][] {
  return pathOf(ROOM[from], ROOM[to]);
}
function walk(pts: [number, number][], t: number): [number, number] {
  const segs = pts.length - 1;
  const s = Math.min(segs - 1, Math.floor(t * segs));
  const lt = t * segs - s;
  const [x0, y0] = pts[s];
  const [x1, y1] = pts[s + 1];
  return [x0 + (x1 - x0) * lt, y0 + (y1 - y0) * lt];
}

/* ───────────────────────────── simulated event stream ──────────────────── */
type EvType =
  "DISPATCH" | "RESULT" | "CHECK" | "CONFLICT" | "SYNTH" | "CRITIQUE" | "CITE" | "REPORT";
interface FlowEv {
  from: string;
  to: string;
  type: EvType;
  text: string;
  color: string;
}

const RES_ROOMS = ["resA", "resB", "resG"];

// One plausible step of the science-crew pipeline.
function nextEvent(): FlowEv {
  const roll = Math.random();
  if (roll < 0.28) {
    const to = RES_ROOMS[(Math.random() * 3) | 0];
    return {
      from: "cmd",
      to,
      type: "DISPATCH",
      text: `dispatch → ${ROOM[to].label.toLowerCase()}`,
      color: C.sith,
    };
  }
  if (roll < 0.5) {
    const from = RES_ROOMS[(Math.random() * 3) | 0];
    return {
      from,
      to: "fact",
      type: "RESULT",
      text: `${ROOM[from].label.toLowerCase()} returns findings`,
      color: C.steel,
    };
  }
  if (roll < 0.62)
    return {
      from: "fact",
      to: "confl",
      type: "CHECK",
      text: "facts verified → conflict scan",
      color: C.amber,
    };
  if (roll < 0.72)
    return {
      from: "confl",
      to: "cmd",
      type: "CONFLICT",
      text: "contradiction flagged",
      color: C.deep,
    };
  if (roll < 0.82)
    return { from: "cmd", to: "synth", type: "SYNTH", text: "synthesis started", color: C.sith };
  if (roll < 0.9)
    return {
      from: "synth",
      to: "crit",
      type: "CRITIQUE",
      text: "argument → critique",
      color: C.toxic,
    };
  if (roll < 0.96)
    return { from: "cite", to: "rep", type: "CITE", text: "citations verified", color: C.amber };
  return { from: "rep", to: "cmd", type: "REPORT", text: "report section sealed", color: C.ember };
}

/* ───────────────────────────── speech bubbles ──────────────────────────── */
interface Bubble {
  id: number;
  room: string;
  text: string;
}
// Short agent chatter keyed by the event that spawned it (like the clip's boxes).
const DIALOG: Record<EvType, string[]> = {
  DISPATCH: ["Deploy to sector.", "Orders received — moving.", "Tasking research wing."],
  RESULT: ["Findings compiled, sir.", "Data packet returned.", "Sources catalogued."],
  CHECK: ["Cross-checking claims…", "Facts hold — verified.", "Integrity scan running."],
  CONFLICT: ["Contradiction detected!", "Sources disagree — flagging.", "Escalating to command."],
  SYNTH: ["Merging the threads.", "Drafting synthesis.", "Argument taking shape."],
  CRITIQUE: ["Poking holes in it.", "Weak point, line 4.", "Adversarial pass on."],
  CITE: ["Anchoring citations.", "References locked.", "Provenance confirmed."],
  REPORT: ["Section sealed.", "Report compiling.", "Ready for command."],
};
function pickDialog(t: EvType) {
  const a = DIALOG[t];
  return a[(Math.random() * a.length) | 0];
}

/* ───────────────────────────── left pool (21 atmospheric agents) ────────── */
const POOL_NAMES = [
  "ULTRON",
  "NOVA",
  "ORACLE",
  "VECTOR",
  "FORGE",
  "MEGATRON",
  "PRISM",
  "SYDES",
  "LEDGER",
  "QUILL",
  "PIXEL",
  "SENTINEL",
  "ATLAS",
  "CIPHER",
  "HALCYON",
  "RIVET",
  "TESSER",
  "MARROW",
  "OBELISK",
  "KESTREL",
  "GLYPH",
];
const CATS = [
  { tag: "MISSION HIGH", color: C.sith },
  { tag: "RESEARCH LOW", color: C.steel },
  { tag: "FACTORY 3", color: C.amber },
  { tag: "LOG 07", color: C.ash },
  { tag: "SYNTH 2", color: C.ember },
  { tag: "GUARD HIGH", color: C.toxic },
];
const POOL_STATUS = [
  "running state optimization",
  "24-hour resolution",
  "generating a creative label variant",
  "ongoing a platform policy change",
  "reconciling ledger deltas",
  "spawning a subprocess",
  "idle — awaiting dispatch",
  "compacting memory buffer",
  "negotiating a handoff",
  "verifying a source anchor",
  "drafting a summary pass",
  "cooling down",
];
interface PoolAgent {
  name: string;
  level: string;
  status: string;
  cat: (typeof CATS)[number];
  active: boolean;
}
function buildPool(): PoolAgent[] {
  return POOL_NAMES.map((name, i) => ({
    name,
    level: "A" + String(((i * 7) % 40) + 1).padStart(2, "0"),
    status: POOL_STATUS[i % POOL_STATUS.length],
    cat: CATS[i % CATS.length],
    active: i < 4,
  }));
}

/* ───────────────────────────── canvas rendering ────────────────────────── */
interface Bead {
  pts: [number, number][];
  t: number;
  speed: number;
  color: string;
  to: string;
}

/* ── crew characters that actually walk around inside their room ── */
interface Character {
  room: string;
  x: number;
  y: number; // feet position, absolute logical coords
  tx: number;
  ty: number; // current walk target
  spd: number; // px per ms
  face: number; // -1 left, 1 right
  step: number; // walk-cycle accumulator
  idle: number; // ms left standing still
  color: string;
  boss: boolean;
  wob: number; // per-character phase offset
}

// The open floor a character may wander — lower/central part of the room,
// clear of the machinery lined up along the top wall.
function roomWalk(r: Room) {
  return {
    x0: r.x + 16,
    y0: r.y + Math.round(r.h * 0.48),
    x1: r.x + r.w - 16,
    y1: r.y + r.h - 12,
  };
}
function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function initCharacters(): Character[] {
  const chars: Character[] = [];
  for (const r of ROOMS) {
    const wk = roomWalk(r);
    const th = ROOM_THEME[r.theme];
    for (let i = 0; i < r.crew; i++) {
      const boss = !!r.boss && i === 0;
      chars.push({
        room: r.id,
        x: rand(wk.x0, wk.x1),
        y: rand(wk.y0, wk.y1),
        tx: rand(wk.x0, wk.x1),
        ty: rand(wk.y0, wk.y1),
        spd: boss ? 0.014 : rand(0.018, 0.03),
        face: Math.random() < 0.5 ? -1 : 1,
        step: Math.random() * 6,
        idle: rand(0, 1200),
        color: boss ? C.green : th.tint,
        boss,
        wob: Math.random() * 6.28,
      });
    }
  }
  return chars;
}

function updateCharacters(chars: Character[], dt: number, active: Record<string, number>) {
  for (const ch of chars) {
    const r = ROOM[ch.room];
    const wk = roomWalk(r);
    const heat = active[ch.room] ?? 0;
    if (ch.idle > 0) {
      ch.idle -= dt;
      continue;
    }
    const dx = ch.tx - ch.x;
    const dy = ch.ty - ch.y;
    const d = Math.hypot(dx, dy);
    if (d < 1.3) {
      // arrived — sometimes pause, then pick a fresh target
      ch.idle = Math.random() < 0.6 ? rand(250, 1600) : 0;
      ch.tx = rand(wk.x0, wk.x1);
      ch.ty = rand(wk.y0, wk.y1);
      continue;
    }
    const spd = ch.spd * (1 + heat * 0.9);
    const mv = Math.min(d, spd * dt);
    ch.x += (dx / d) * mv;
    ch.y += (dy / d) * mv;
    ch.face = dx < 0 ? -1 : 1;
    ch.step += mv * 0.55;
  }
}

function polyline(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
}

// Procedural Milky-Way sky: a diagonal haze band, dust patches and layered
// stars — used until a real starfield photo is dropped in at public/station-bg.jpg.
function drawMilkyWay(
  ctx: CanvasRenderingContext2D,
  stars: { x: number; y: number; b: number; s: number }[],
) {
  ctx.fillStyle = "#04050a";
  ctx.fillRect(0, 0, W, H);
  // diagonal galactic haze band
  ctx.save();
  ctx.translate(W * 0.5, H * 0.5);
  ctx.rotate(-0.5);
  const band = ctx.createLinearGradient(0, -120, 0, 120);
  band.addColorStop(0, "rgba(120,140,170,0)");
  band.addColorStop(0.5, "rgba(150,165,195,0.16)");
  band.addColorStop(1, "rgba(120,140,170,0)");
  ctx.fillStyle = band;
  ctx.fillRect(-W, -70, W * 2, 140);
  // brighter core of the band
  const core = ctx.createRadialGradient(-40, 0, 8, -40, 0, 150);
  core.addColorStop(0, "rgba(200,205,225,0.14)");
  core.addColorStop(1, "rgba(200,205,225,0)");
  ctx.fillStyle = core;
  ctx.fillRect(-W, -100, W * 2, 200);
  // dark dust lanes cutting across the band
  ctx.fillStyle = "rgba(4,5,10,0.5)";
  ctx.fillRect(-W, -6, W * 2, 5);
  ctx.fillRect(-W, 14, W * 2, 3);
  ctx.restore();
  // layered stars
  for (const s of stars) {
    ctx.fillStyle = `rgba(228,234,240,${s.b})`;
    ctx.fillRect(s.x, s.y, 1, 1);
    if (s.s > 0) {
      // brighter star with a soft cross glow
      ctx.fillStyle = `rgba(228,234,240,${s.b * 0.35})`;
      ctx.fillRect(s.x - 1, s.y, 3, 1);
      ctx.fillRect(s.x, s.y - 1, 1, 3);
    }
  }
}

function drawStatic(
  ctx: CanvasRenderingContext2D,
  stars: { x: number; y: number; b: number; s: number }[],
  bg?: HTMLImageElement,
) {
  if (bg && bg.width) {
    // real starfield photo, cover-fitted and slightly darkened so the UI reads
    const scale = Math.max(W / bg.width, H / bg.height);
    const dw = bg.width * scale;
    const dh = bg.height * scale;
    ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.fillStyle = "rgba(4,5,10,0.32)";
    ctx.fillRect(0, 0, W, H);
  } else {
    drawMilkyWay(ctx, stars);
  }
  // faint green nebula wash tying it to the terminal palette
  const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 360);
  g.addColorStop(0, "rgba(57,255,156,0.04)");
  g.addColorStop(1, "rgba(4,5,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // corridors as lit tubes with side rails
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const [a, b] of EDGES) {
    const pts = edgePath(a, b);
    polyline(ctx, pts);
    ctx.strokeStyle = hexA(C.ash, 0.28);
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = "#080a12";
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = hexA(C.ash, 0.16);
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // rooms
  for (const r of ROOMS) drawRoom(ctx, r);
}

// The palette of real objects each room is furnished with (placed across the
// whole floor, not just a wall) so every room reads as a lived-in module.
const FURN: Record<string, Prop[]> = {
  cmd: ["console", "reactor", "console", "screen", "desk", "console"],
  resA: ["desk", "rack", "desk", "rack", "console", "chair"],
  resB: ["rack", "desk", "console", "rack", "desk", "chair"],
  resG: ["desk", "console", "rack", "desk", "rack", "chair"],
  fact: ["screen", "desk", "console", "table", "screen"],
  confl: ["screen", "crate", "console", "barrel", "screen"],
  synth: ["reactor", "console", "desk", "tank", "screen"],
  crit: ["plant", "desk", "console", "table", "plant"],
  cite: ["desk", "console", "screen", "table", "console"],
  rep: ["console", "pod", "crate", "desk", "barrel"],
};
type Prop =
  | "rack"
  | "console"
  | "reactor"
  | "crate"
  | "pod"
  | "screen"
  | "plant"
  | "desk"
  | "chair"
  | "table"
  | "tank"
  | "barrel";

// Small deterministic PRNG so the dense interior is stable frame-to-frame.
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// L-shaped yellow bracket at a room corner (x,y) with arms extending in the
// sx/sy directions (+1 right/down, -1 left/up) — the video's frame markers.
function cornerBracket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sx: number,
  sy: number,
) {
  const L = 8;
  const T = 2;
  ctx.fillStyle = C.yellow;
  const hx = sx > 0 ? x : x - L;
  const hy = sy > 0 ? y : y - T;
  ctx.fillRect(hx, hy, L, T); // horizontal arm
  const vx = sx > 0 ? x : x - T;
  const vy = sy > 0 ? y : y - L;
  ctx.fillRect(vx, vy, T, L); // vertical arm
}

function drawRoom(ctx: CanvasRenderingContext2D, r: Room) {
  const th = ROOM_THEME[r.theme];
  // floor base
  ctx.fillStyle = th.floor;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // dense "circuit-board" interior packed across the whole floor
  drawRoomDetail(ctx, r, th.tint);

  // inner wall band with door gaps top & bottom
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, 4); // top wall
  ctx.fillRect(r.x + 3, r.y + r.h - 7, r.w - 6, 4); // bottom wall
  ctx.fillStyle = th.floor; // carve doors
  ctx.fillRect(cx(r) - 6, r.y + 3, 12, 4);
  ctx.fillRect(cx(r) - 6, r.y + r.h - 7, 12, 4);

  // real furniture placed across the whole floor
  placeProps(ctx, r, th.tint);

  // shared cyan wall frame
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  // yellow L-brackets at the four corners
  cornerBracket(ctx, r.x - 1, r.y - 1, 1, 1);
  cornerBracket(ctx, r.x + r.w, r.y - 1, -1, 1);
  cornerBracket(ctx, r.x - 1, r.y + r.h, 1, -1);
  cornerBracket(ctx, r.x + r.w, r.y + r.h, -1, -1);
}

// A faint floor grid + a couple of wall pipe runs — a subtle backdrop that the
// real furniture (placeProps) sits on top of.
function drawRoomDetail(ctx: CanvasRenderingContext2D, r: Room, tint: string) {
  const top = r.y + 9;
  const bot = r.y + r.h - 9;
  const left = r.x + 5;
  const right = r.x + r.w - 5;
  ctx.strokeStyle = hexA(tint, 0.05);
  ctx.lineWidth = 1;
  for (let gx = left; gx < right; gx += 12) {
    ctx.beginPath();
    ctx.moveTo(gx + 0.5, top);
    ctx.lineTo(gx + 0.5, bot);
    ctx.stroke();
  }
  for (let gy = top; gy < bot; gy += 12) {
    ctx.beginPath();
    ctx.moveTo(left, gy + 0.5);
    ctx.lineTo(right, gy + 0.5);
    ctx.stroke();
  }
  // a couple of pipe runs along the side walls
  ctx.fillStyle = hexA(tint, 0.18);
  ctx.fillRect(r.x + 3, top, 1, bot - top);
  ctx.fillRect(r.x + r.w - 4, top, 1, bot - top);
}

// Lays the room's furniture palette across the floor on a jittered grid so each
// room looks packed with recognisable objects rather than abstract noise.
function placeProps(ctx: CanvasRenderingContext2D, r: Room, tint: string) {
  const rng = mulberry(((r.x * 73856093) ^ (r.y * 19349663)) >>> 0);
  const palette = FURN[r.id] ?? ["console"];
  const cw = 24;
  const ch = 26;
  const left = r.x + 8;
  const right = r.x + r.w - 18;
  const top = r.y + 12;
  const bot = r.y + r.h - 22;
  let k = 0;
  // gather cells first, then draw sorted by y so lower objects overlap upper
  const cells: { x: number; y: number; p: Prop }[] = [];
  for (let gy = top; gy <= bot; gy += ch) {
    for (let gx = left; gx <= right; gx += cw) {
      if (rng() < 0.22) continue; // leave some walking space
      const p = palette[k++ % palette.length];
      cells.push({
        x: Math.round(gx + rng() * 4),
        y: Math.round(gy + rng() * 4),
        p,
      });
    }
  }
  cells.sort((a, b) => a.y - b.y);
  for (const c of cells) drawProp(ctx, c.p, c.x, c.y, tint);
}

// ── procedural pixel furniture (copyright-clean, drawn by hand) ──
function drawProp(ctx: CanvasRenderingContext2D, kind: Prop, x: number, y: number, color: string) {
  switch (kind) {
    case "rack": {
      ctx.fillStyle = "#0d1018";
      ctx.fillRect(x, y, 10, 16);
      ctx.fillStyle = "#05070c";
      ctx.fillRect(x + 1, y + 1, 8, 14);
      for (let ry = y + 2; ry < y + 15; ry += 3) {
        ctx.fillStyle = shade(color, 0.7);
        ctx.fillRect(x + 2, ry, 6, 1);
        ctx.fillStyle = hexA(color, 0.9);
        ctx.fillRect(x + 2, ry, 1, 1);
      }
      break;
    }
    case "console": {
      ctx.fillStyle = "#0d1018";
      ctx.fillRect(x, y + 6, 14, 6);
      ctx.fillStyle = "#0a0d14";
      ctx.fillRect(x + 1, y, 12, 6); // screen back
      ctx.fillStyle = hexA(color, 0.55);
      ctx.fillRect(x + 2, y + 1, 10, 4); // glowing screen
      ctx.fillStyle = hexA(color, 0.95);
      ctx.fillRect(x + 3, y + 2, 3, 1);
      break;
    }
    case "reactor": {
      ctx.fillStyle = "#0b0e16";
      ctx.fillRect(x - 1, y, 14, 14);
      ctx.fillStyle = shade(color, 0.5);
      ctx.fillRect(x + 1, y + 2, 10, 10);
      ctx.fillStyle = hexA(color, 0.9);
      ctx.fillRect(x + 4, y + 1, 4, 12);
      ctx.fillRect(x + 1, y + 4, 10, 4);
      ctx.fillStyle = "#fff";
      ctx.fillRect(x + 5, y + 5, 2, 2);
      break;
    }
    case "crate": {
      ctx.fillStyle = "#2a2016";
      ctx.fillRect(x, y + 4, 10, 10);
      ctx.fillStyle = "#3a2c1c";
      ctx.fillRect(x + 1, y + 5, 8, 8);
      ctx.strokeStyle = "#1a140c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 5);
      ctx.lineTo(x + 9, y + 13);
      ctx.moveTo(x + 9, y + 5);
      ctx.lineTo(x + 1, y + 13);
      ctx.stroke();
      break;
    }
    case "pod": {
      ctx.fillStyle = "#0d1018";
      ctx.fillRect(x - 1, y + 3, 16, 9);
      ctx.fillStyle = hexA(color, 0.35);
      ctx.fillRect(x + 1, y + 4, 12, 7); // glass
      ctx.fillStyle = hexA(color, 0.7);
      ctx.fillRect(x + 2, y + 5, 10, 1);
      break;
    }
    case "screen": {
      ctx.fillStyle = "#0d1018";
      ctx.fillRect(x, y, 12, 8);
      ctx.fillStyle = hexA(color, 0.45);
      ctx.fillRect(x + 1, y + 1, 10, 6);
      ctx.fillStyle = hexA(color, 0.85);
      for (let ly = y + 2; ly < y + 7; ly += 2) ctx.fillRect(x + 2, ly, 8, 1);
      break;
    }
    case "plant": {
      ctx.fillStyle = "#241a10";
      ctx.fillRect(x + 2, y + 8, 6, 5);
      ctx.fillStyle = shade(C.toxic, 0.8);
      ctx.fillRect(x + 1, y + 2, 8, 7);
      ctx.fillStyle = hexA(C.toxic, 0.9);
      ctx.fillRect(x + 3, y + 1, 4, 4);
      break;
    }
    case "desk": {
      // operator workstation: desk + lit monitor + seat
      ctx.fillStyle = "#12161d";
      ctx.fillRect(x, y + 4, 15, 7); // desk top
      ctx.fillStyle = "#0a0d13";
      ctx.fillRect(x, y + 11, 15, 1); // front edge shadow
      ctx.fillStyle = "#05070c"; // monitor back
      ctx.fillRect(x + 3, y, 9, 5);
      ctx.fillStyle = hexA(color, 0.6); // screen
      ctx.fillRect(x + 4, y + 1, 7, 3);
      ctx.fillStyle = hexA(color, 0.95);
      ctx.fillRect(x + 5, y + 2, 2, 1);
      ctx.fillStyle = "#2a3038"; // seat
      ctx.fillRect(x + 5, y + 13, 5, 3);
      ctx.fillStyle = "#1a1f26";
      ctx.fillRect(x + 5, y + 12, 5, 1);
      break;
    }
    case "chair": {
      ctx.fillStyle = "#2a3038";
      ctx.fillRect(x + 2, y + 4, 6, 4); // seat
      ctx.fillStyle = "#1a1f26";
      ctx.fillRect(x + 2, y + 2, 6, 2); // backrest
      ctx.fillStyle = "#0a0d13";
      ctx.fillRect(x + 4, y + 8, 2, 2); // stem
      break;
    }
    case "table": {
      ctx.fillStyle = "#161b12";
      ctx.fillRect(x, y + 3, 15, 8); // surface
      ctx.fillStyle = "#0e120c";
      ctx.fillRect(x + 1, y + 10, 13, 1);
      // items on top
      ctx.fillStyle = hexA(color, 0.8);
      ctx.fillRect(x + 3, y + 5, 2, 2);
      ctx.fillStyle = hexA(C.amber, 0.85);
      ctx.fillRect(x + 8, y + 6, 2, 1);
      ctx.fillStyle = "#8a94a0";
      ctx.fillRect(x + 11, y + 5, 2, 2);
      break;
    }
    case "tank": {
      // vertical containment cylinder with glowing liquid
      ctx.fillStyle = "#0a0e14";
      ctx.fillRect(x + 2, y, 9, 16);
      ctx.fillStyle = "#05080c";
      ctx.fillRect(x + 2, y, 1, 16);
      ctx.fillStyle = hexA(color, 0.4);
      ctx.fillRect(x + 3, y + 3, 7, 11); // liquid
      ctx.fillStyle = hexA(color, 0.85);
      ctx.fillRect(x + 4, y + 4, 1, 9); // highlight
      ctx.fillStyle = "#1a1f28"; // caps
      ctx.fillRect(x + 1, y, 11, 2);
      ctx.fillRect(x + 1, y + 14, 11, 2);
      break;
    }
    case "barrel": {
      ctx.fillStyle = "#3a2c1c";
      ctx.fillRect(x + 2, y + 3, 9, 11);
      ctx.fillStyle = "#4a3826";
      ctx.fillRect(x + 3, y + 3, 7, 11);
      ctx.fillStyle = "#1a140c"; // rings
      ctx.fillRect(x + 2, y + 6, 9, 1);
      ctx.fillRect(x + 2, y + 10, 9, 1);
      ctx.fillStyle = hexA(C.amber, 0.5);
      ctx.fillRect(x + 5, y + 4, 3, 1);
      break;
    }
  }
}

function drawDynamic(
  ctx: CanvasRenderingContext2D,
  beads: Bead[],
  chars: Character[],
  active: Record<string, number>,
  now: number,
) {
  // ── glow pass (additive) ──
  ctx.globalCompositeOperation = "lighter";
  for (const r of ROOMS) {
    const th = ROOM_THEME[r.theme];
    const heat = active[r.id] ?? 0;
    const pulse = 0.35 + 0.25 * Math.sin(now / 320 + r.x);
    const glow = Math.min(1, pulse + heat);
    // cyan frame glow
    ctx.strokeStyle = hexA(EDGE, 0.14 + 0.4 * glow);
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1);
    if (heat > 0.05) {
      // tinted outer halo + the signature big radial room glow
      ctx.strokeStyle = hexA(th.tint, 0.3 * heat);
      ctx.strokeRect(r.x - 2.5, r.y - 2.5, r.w + 5, r.h + 5);
      const rg = ctx.createRadialGradient(cx(r), cy(r), 2, cx(r), cy(r), r.w * 0.62);
      rg.addColorStop(0, hexA(th.tint, 0.55 * Math.min(1, heat)));
      rg.addColorStop(0.6, hexA(th.tint, 0.12 * Math.min(1, heat)));
      rg.addColorStop(1, hexA(th.tint, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
    }
    // red horizontal scan beam (gently bobbing, brighter with activity)
    const beamY = Math.round(r.y + r.h * 0.3 + Math.sin(now / 700 + r.x) * 3);
    ctx.fillStyle = hexA(C.scan, 0.12);
    ctx.fillRect(r.x + 2, beamY - 1, r.w - 4, 3);
    ctx.fillStyle = hexA(C.scan, 0.45 + 0.35 * heat + 0.1 * Math.sin(now / 130));
    ctx.fillRect(r.x + 2, beamY, r.w - 4, 1);
    // blinking machine LEDs along the top wall
    const props = FURN[r.id] ?? [];
    const step = (r.w - 20) / Math.max(1, props.length);
    for (let i = 0; i < props.length; i++) {
      const on = (now / 240 + i * 1.7 + r.y) % 3 < 1.4;
      if (on) {
        ctx.fillStyle = hexA(C.amber, 0.85);
        ctx.fillRect(Math.round(r.x + 12 + step * i), r.y + 8, 2, 2);
      }
    }
  }
  for (const ch of chars) drawCharGlow(ctx, ch, now, active[ch.room] ?? 0);

  // ── solid sprites (normal blend) ──
  ctx.globalCompositeOperation = "source-over";
  for (const ch of [...chars].sort((a, b) => a.y - b.y)) drawCharBody(ctx, ch, now);

  // ── travelling beads (additive) ──
  ctx.globalCompositeOperation = "lighter";
  for (const b of beads) {
    const [x, y] = walk(b.pts, Math.min(1, b.t));
    ctx.fillStyle = hexA(b.color, 0.18);
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = hexA(b.color, 0.55);
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    for (let k = 1; k <= 3; k++) {
      const [tx, ty] = walk(b.pts, Math.max(0, b.t - k * 0.02));
      ctx.fillStyle = hexA(b.color, 0.18 / k);
      ctx.fillRect(tx - 1, ty - 1, 2, 2);
    }
  }

  ctx.globalCompositeOperation = "source-over";
  drawMinimap(ctx, active, now);
}

function drawCharGlow(ctx: CanvasRenderingContext2D, ch: Character, now: number, heat: number) {
  const b = ch.boss;
  const pulse = 0.55 + 0.45 * Math.sin(now / (b ? 300 : 520) + ch.wob);
  const cy0 = ch.y - (b ? 8 : 5);
  // base aura
  const rx = b ? 11 : 6;
  ctx.fillStyle = hexA(ch.color, (b ? 0.15 : 0.08) * (0.6 + 0.4 * pulse));
  ctx.fillRect(ch.x - rx, cy0 - rx, rx * 2, rx * 2);
  // large radial glow when the crew's room is active — the signature look
  const act = Math.min(1, heat);
  if (act > 0.05 || b) {
    const R = (b ? 26 : 18) * (0.7 + 0.5 * act);
    const g = ctx.createRadialGradient(ch.x, cy0, 1, ch.x, cy0, R);
    g.addColorStop(0, hexA(ch.color, (0.18 + 0.4 * act) * (0.7 + 0.3 * pulse)));
    g.addColorStop(0.5, hexA(ch.color, 0.1 * (0.5 + act)));
    g.addColorStop(1, hexA(ch.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(ch.x - R, cy0 - R, R * 2, R * 2);
  }
}

// A chunky humanoid with a 2-frame walk cycle. ch.(x,y) is the feet centre.
function drawCharBody(ctx: CanvasRenderingContext2D, ch: Character, now: number) {
  const b = ch.boss;
  const moving = ch.idle <= 0;
  const phase = Math.floor(ch.step) % 2;
  const breathe = !moving && Math.sin(now / 600 + ch.wob) > 0 ? -1 : 0;
  const x = Math.round(ch.x);
  const y = Math.round(ch.y);

  const headW = b ? 6 : 4;
  const headH = b ? 5 : 4;
  const torW = b ? 8 : 6;
  const torH = b ? 8 : 6;
  const legH = b ? 4 : 3;
  const lw = b ? 3 : 2;

  // crew wear white/grey armour (like the astronauts in the clip); only the
  // core + visor glow in the room tint. The boss keeps a tinted suit.
  const dark = b ? shade(ch.color, 0.5) : "#7f8a95";
  const mid = b ? shade(ch.color, 0.82) : "#dde6ee";
  const legTop = y - legH;
  const torTop = legTop - torH + breathe;
  const headTop = torTop - headH;

  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x - torW / 2 - 1, y, torW + 2, 2);

  // legs (alternating step)
  ctx.fillStyle = dark;
  const liftL = moving ? (phase ? -1 : 0) : 0;
  const liftR = moving ? (phase ? 0 : -1) : 0;
  ctx.fillRect(x - torW / 2, legTop + liftL, lw, legH - liftL);
  ctx.fillRect(x + torW / 2 - lw, legTop + liftR, lw, legH - liftR);

  // arms
  ctx.fillStyle = dark;
  ctx.fillRect(x - torW / 2 - 1, torTop + 1, 1, torH - 2);
  ctx.fillRect(x + torW / 2, torTop + 1, 1, torH - 2);

  // torso + lit core
  ctx.fillStyle = mid;
  ctx.fillRect(x - torW / 2, torTop, torW, torH);
  ctx.fillStyle = ch.color;
  ctx.fillRect(x - 1, torTop + 1, b ? 3 : 2, torH - 2);

  // head + visor eye on the facing side
  ctx.fillStyle = mid;
  ctx.fillRect(x - headW / 2, headTop, headW, headH);
  ctx.fillStyle = "#fff";
  const ex = ch.face < 0 ? x - headW / 2 + 1 : x + headW / 2 - 2;
  ctx.fillRect(ex, headTop + (b ? 2 : 1), b ? 2 : 1, 1);

  // boss crown + pauldrons
  if (b) {
    ctx.fillStyle = ch.color;
    ctx.fillRect(x - 1, headTop - 2, 2, 2);
    ctx.fillStyle = dark;
    ctx.fillRect(x - torW / 2 - 1, torTop, 2, 2);
    ctx.fillRect(x + torW / 2 - 1, torTop, 2, 2);
  }
}

function drawMinimap(ctx: CanvasRenderingContext2D, active: Record<string, number>, now: number) {
  const mw = 78,
    mh = 50,
    mx = W - mw - 6,
    my = H - mh - 6;
  const sx = mw / W,
    sy = mh / H;
  ctx.fillStyle = "rgba(4,5,10,0.85)";
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = hexA(C.sith, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
  for (const r of ROOMS) {
    const th = ROOM_THEME[r.theme];
    const heat = active[r.id] ?? 0;
    ctx.fillStyle = hexA(th.tint, 0.4 + 0.6 * heat);
    ctx.fillRect(mx + r.x * sx, my + r.y * sy, Math.max(2, r.w * sx), Math.max(2, r.h * sy));
  }
  // sweep line
  const sweep = (now / 22) % mw;
  ctx.fillStyle = hexA(C.sith, 0.25);
  ctx.fillRect(mx + sweep, my + 1, 1, mh - 2);
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
// Darken a hex colour toward black by factor f (0..1).
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(((n >> 16) & 255) * f) | 0},${(((n >> 8) & 255) * f) | 0},${((n & 255) * f) | 0})`;
}

/* ───────────────────────────── component ───────────────────────────────── */
function Station() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beadsRef = useRef<Bead[]>([]);
  const charsRef = useRef<Character[]>([]);
  const activeRef = useRef<Record<string, number>>({});
  const pausedRef = useRef(false);

  const [paused, setPaused] = useState(false);
  const [pool, setPool] = useState<PoolAgent[]>(buildPool);
  const [log, setLog] = useState<{ id: number; text: string; color: string; type: string }[]>([]);
  const [missions, setMissions] = useState(() => [
    { id: 1, text: "Decompose research question", state: "done" as const },
    { id: 2, text: "Parallel source sweep α/β/γ", state: "run" as const },
    { id: 3, text: "Fact-check returned claims", state: "run" as const },
    { id: 4, text: "Resolve contradictions", state: "queue" as const },
    { id: 5, text: "Synthesise argument", state: "queue" as const },
    { id: 6, text: "Adversarial critique pass", state: "queue" as const },
    { id: 7, text: "Verify citations", state: "queue" as const },
    { id: 8, text: "Compile final report", state: "queue" as const },
  ]);
  const [stats, setStats] = useState({ uptime: 0, tokens: 0, cost: 0, jobs: 0, active: 4 });
  const [morale, setMorale] = useState(78);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      pausedRef.current = !p;
      return !p;
    });
  }, []);

  /* ── render loop (canvas) ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const stars = Array.from({ length: 260 }, () => {
      const bright = Math.random();
      return {
        x: (Math.random() * W) | 0,
        y: (Math.random() * H) | 0,
        b: 0.1 + bright * bright * 0.7,
        s: bright > 0.82 ? 1 : 0,
      };
    });

    // static layer cached to an offscreen canvas (procedural sky first)
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const octx = off.getContext("2d")!;
    drawStatic(octx, stars);
    // if a real starfield photo is present at public/station-bg.jpg, use it
    const bg = new Image();
    bg.onload = () => drawStatic(octx, stars, bg);
    bg.onerror = () => {};
    bg.src = "/station-bg.jpg";

    // crew that walks around the rooms
    charsRef.current = initCharacters();

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!pausedRef.current) {
        // advance beads
        const alive: Bead[] = [];
        for (const b of beadsRef.current) {
          b.t += b.speed * dt;
          if (b.t >= 1) {
            activeRef.current[b.to] = Math.min(1.4, (activeRef.current[b.to] ?? 0) + 0.9);
          } else alive.push(b);
        }
        beadsRef.current = alive;
        // move the crew
        updateCharacters(charsRef.current, dt, activeRef.current);
        // decay activity heat
        for (const k in activeRef.current) {
          activeRef.current[k] = Math.max(0, activeRef.current[k] - dt * 0.0009);
        }
      }
      ctx.drawImage(off, 0, 0);
      drawDynamic(ctx, beadsRef.current, charsRef.current, activeRef.current, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── logical event emitter (updates React state + spawns a bead) ── */
  useEffect(() => {
    let evId = 0;
    let missionCursor = 2;
    const tick = () => {
      if (!pausedRef.current) {
        const ev = nextEvent();
        // bead
        beadsRef.current.push({
          pts: edgePath(ev.from, ev.to),
          t: 0,
          speed: 0.0011 + Math.random() * 0.0009,
          color: ev.color,
          to: ev.to,
        });
        activeRef.current[ev.from] = Math.min(1.4, (activeRef.current[ev.from] ?? 0) + 0.6);
        // log
        evId += 1;
        const id = evId;
        setLog((l) => [{ id, text: ev.text, color: ev.color, type: ev.type }, ...l].slice(0, 40));
        // speech bubble over the receiving room (auto-expires)
        if (Math.random() < 0.6) {
          const room = Math.random() < 0.5 ? ev.to : ev.from;
          const bub: Bubble = { id, room, text: pickDialog(ev.type) };
          setBubbles((bs) => [...bs.filter((b) => b.room !== room), bub].slice(-4));
          window.setTimeout(() => setBubbles((bs) => bs.filter((b) => b.id !== id)), 3400);
        }
        // morale drifts with conflicts vs. sealed reports
        if (ev.type === "CONFLICT") setMorale((m) => Math.max(20, m - 3));
        else if (ev.type === "REPORT") setMorale((m) => Math.min(99, m + 2));
        // counters
        const dtok = 40 + ((Math.random() * 260) | 0);
        setStats((s) => ({
          ...s,
          tokens: s.tokens + dtok,
          cost: s.cost + dtok * 0.000003,
          jobs: s.jobs + (ev.type === "REPORT" ? 1 : 0),
        }));
        // nudge a pool agent's status + activity
        setPool((p) => {
          const i = (Math.random() * p.length) | 0;
          return p.map((a, j) =>
            j === i
              ? {
                  ...a,
                  status: POOL_STATUS[(Math.random() * POOL_STATUS.length) | 0],
                  active: true,
                }
              : Math.random() < 0.06
                ? { ...a, active: false }
                : a,
          );
        });
        // advance mission queue occasionally
        if (ev.type === "REPORT" && missionCursor < 8) {
          const done = missionCursor;
          missionCursor += 1;
          setMissions((m) =>
            m.map((t) =>
              t.id === done
                ? { ...t, state: "done" as const }
                : t.id === missionCursor
                  ? { ...t, state: "run" as const }
                  : t,
            ),
          );
        }
      }
      timer = window.setTimeout(tick, 700 + Math.random() * 900);
    };
    let timer = window.setTimeout(tick, 400);
    return () => window.clearTimeout(timer);
  }, []);

  /* ── uptime + active-count clock ── */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setStats((s) => ({ ...s, uptime: s.uptime + 1 }));
      setPool((p) => {
        const active = p.filter((a) => a.active).length;
        setStats((s) => ({ ...s, active }));
        return p;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const upt = fmtUptime(stats.uptime);

  return (
    <div style={sx.root}>
      <style>{KEYFRAMES}</style>

      {/* ── top status bar (segmented green pill HUD, video-style) ── */}
      <header style={sx.topbar}>
        <div style={sx.logoWrap}>
          <span style={sx.logoMark}>◈</span>
          <span style={sx.logo}>ULTRON-08</span>
        </div>
        <div style={sx.metrics}>
          <Pill label="OPS" value={upt} />
          <Pill label="LINKED" value={`${stats.active}/${pool.length}`} />
          <Pill label="TOKENS" value={stats.tokens.toLocaleString("en-US")} />
          <Pill label="COST" value={"$" + stats.cost.toFixed(4)} />
          <ModePill active={!paused} />
          <MoralePill morale={morale} />
        </div>
        <div style={sx.topRight}>
          <span style={{ ...sx.liveDot, background: paused ? C.ash : C.sith }} />
          <span style={{ color: paused ? C.ash : C.sith, ...sx.liveTxt }}>
            {paused ? "PAUSED" : "LIVE"}
          </span>
          <Link to="/" style={sx.exit}>
            ✕ EXIT
          </Link>
        </div>
      </header>

      {/* ── main 3-column body ── */}
      <div style={sx.body}>
        {/* left: agent pool */}
        <aside style={sx.pool}>
          <div style={sx.panelHead}>AGENT POOL · {pool.length} AGENTS</div>
          <div style={sx.poolScroll}>
            {pool.map((a) => (
              <div
                key={a.name}
                style={{ ...sx.poolRow, borderLeftColor: a.active ? C.sith : "transparent" }}
              >
                <div style={sx.poolTop}>
                  <span style={{ ...sx.poolName, color: a.active ? C.bone : C.ash }}>{a.name}</span>
                  <span style={sx.poolLevel}>{a.level}</span>
                  <span
                    style={{
                      ...sx.poolTag,
                      color: a.cat.color,
                      borderColor: hexA(a.cat.color, 0.4),
                    }}
                  >
                    {a.cat.tag}
                  </span>
                </div>
                <div style={sx.poolStatus}>{a.status}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* centre: station canvas */}
        <main style={sx.stage}>
          <div style={sx.stageInner}>
            <canvas ref={canvasRef} style={sx.canvas} />
            <div style={sx.scanlines} />
            {/* crisp HTML room labels over the canvas */}
            {ROOMS.map((r) => (
              <span
                key={r.id}
                style={{
                  ...sx.roomLabel,
                  left: `${(cx(r) / W) * 100}%`,
                  top: `${(r.y / H) * 100}%`,
                  color: ROOM_THEME[r.theme].tint,
                  fontWeight: r.boss ? 700 : 500,
                }}
              >
                {r.label}
              </span>
            ))}
            {/* speech bubbles over the rooms (crisp HTML, auto-fade) */}
            {bubbles.map((b) => {
              const r = ROOM[b.room];
              return (
                <span
                  key={b.id}
                  style={{
                    ...sx.bubble,
                    left: `${(cx(r) / W) * 100}%`,
                    top: `${((r.y + 14) / H) * 100}%`,
                  }}
                >
                  {b.text}
                </span>
              );
            })}
          </div>
        </main>

        {/* right: mission queue + log */}
        <aside style={sx.right}>
          <div style={sx.panelHead}>MISSION QUEUE</div>
          <div style={sx.missions}>
            {missions.map((m) => (
              <div key={m.id} style={sx.mission}>
                <span style={{ ...sx.missionIcon, color: MISSION_COLOR[m.state] }}>
                  {MISSION_ICON[m.state]}
                </span>
                <span style={{ ...sx.missionTxt, color: m.state === "queue" ? C.ash : C.bone }}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          <div style={sx.panelHead}>EVENT STREAM</div>
          <div style={sx.log}>
            {log.map((e) => (
              <div key={e.id} style={sx.logRow}>
                <span style={{ ...sx.logType, color: e.color, borderColor: hexA(e.color, 0.4) }}>
                  {e.type}
                </span>
                <span style={sx.logTxt}>{e.text}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ── bottom button bar ── */}
      <footer style={sx.bottombar}>
        <BtnBar label={paused ? "▶ RESUME" : "❚❚ PAUSE"} onClick={togglePause} primary />
        <BtnBar label="SETTINGS" />
        <BtnBar label="AGENTS" />
        <BtnBar label="MISSIONS" />
        <BtnBar label="LOGS" />
        <span style={sx.buildTag}>PHASE 1 · SIMULATED STREAM · NO LLM · $0.00</span>
      </footer>
    </div>
  );
}

/* ───────────────────────────── small pieces ────────────────────────────── */
function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div style={sx.pill}>
      <span style={sx.pillLabel}>{label}</span>
      <span style={sx.pillValue}>{value}</span>
    </div>
  );
}
function ModePill({ active }: { active: boolean }) {
  return (
    <div style={{ ...sx.pill, ...sx.pillMode, opacity: active ? 1 : 0.5 }}>
      <span style={{ ...sx.pillLabel, color: C.void }}>MODE</span>
      <span style={{ ...sx.pillValue, color: C.void, fontWeight: 700 }}>AUTOPILOT</span>
    </div>
  );
}
function MoralePill({ morale }: { morale: number }) {
  const face = morale > 70 ? "◕‿◕" : morale > 45 ? "•_•" : "×╭╮×";
  return (
    <div style={sx.pill}>
      <span style={{ ...sx.pillValue, fontSize: 14, letterSpacing: 0 }}>{face}</span>
      <span style={sx.pillLabel}>MORALE {morale}%</span>
    </div>
  );
}
function BtnBar({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...sx.btn,
        color: primary ? C.sith : C.ash,
        borderColor: primary ? hexA(C.sith, 0.6) : hexA(C.ash, 0.4),
      }}
    >
      {label}
    </button>
  );
}

const MISSION_ICON = { done: "✓", run: "▸", queue: "○" } as const;
const MISSION_COLOR = { done: C.toxic, run: C.amber, queue: C.ash } as const;

function fmtUptime(s: number) {
  const h = (s / 3600) | 0,
    m = ((s % 3600) / 60) | 0,
    sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/* ───────────────────────────── styles ──────────────────────────────────── */
const mono = '"JetBrains Mono", ui-monospace, monospace';
const sx: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    background: C.void,
    color: C.bone,
    fontFamily: mono,
    overflow: "hidden",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "8px 14px",
    borderBottom: `1px solid ${hexA(C.sith, 0.25)}`,
    background: C.hull,
    flexShrink: 0,
  },
  logoWrap: { display: "flex", alignItems: "baseline", gap: 8 },
  logoMark: { color: C.sith, fontSize: 16, textShadow: `0 0 8px ${C.sith}` },
  logo: {
    color: C.sith,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 3,
    textShadow: `0 0 10px ${hexA(C.sith, 0.6)}`,
  },
  metrics: { display: "flex", gap: 8, marginLeft: 8, flexWrap: "wrap", alignItems: "center" },
  pill: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    lineHeight: 1.15,
    padding: "3px 10px",
    border: `1px solid ${hexA(C.sith, 0.5)}`,
    borderRadius: 5,
    background: hexA(C.sith, 0.05),
    boxShadow: `0 0 8px ${hexA(C.sith, 0.15)}, inset 0 0 6px ${hexA(C.sith, 0.06)}`,
  },
  pillMode: {
    background: C.sith,
    border: `1px solid ${C.sith}`,
    boxShadow: `0 0 12px ${hexA(C.sith, 0.7)}`,
  },
  pillLabel: { fontSize: 7.5, letterSpacing: 1.2, color: hexA(C.sith, 0.75) },
  pillValue: {
    fontSize: 12,
    fontWeight: 600,
    color: C.sith,
    fontVariantNumeric: "tabular-nums",
    textShadow: `0 0 6px ${hexA(C.sith, 0.5)}`,
  },
  topRight: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    boxShadow: `0 0 8px currentColor`,
    animation: "sithPulse 1.4s infinite",
  },
  liveTxt: { fontSize: 10, letterSpacing: 2, fontWeight: 600 },
  exit: {
    color: C.ash,
    fontSize: 10,
    letterSpacing: 1.5,
    textDecoration: "none",
    padding: "3px 8px",
    border: `1px solid ${hexA(C.ash, 0.3)}`,
  },

  body: { flex: 1, display: "flex", minHeight: 0 },

  pool: {
    width: 246,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: C.hull,
    borderRight: `1px solid ${hexA(C.sith, 0.15)}`,
  },
  panelHead: {
    padding: "7px 12px",
    fontSize: 9,
    letterSpacing: 2,
    color: C.sith,
    borderBottom: `1px solid ${hexA(C.sith, 0.2)}`,
    background: hexA(C.sith, 0.04),
    flexShrink: 0,
  },
  poolScroll: { overflowY: "auto", flex: 1 },
  poolRow: {
    padding: "6px 10px 6px 8px",
    borderLeft: "3px solid transparent",
    borderBottom: `1px solid ${hexA(C.ash, 0.08)}`,
  },
  poolTop: { display: "flex", alignItems: "center", gap: 6 },
  poolName: { fontSize: 11, fontWeight: 600, letterSpacing: 1 },
  poolLevel: {
    fontSize: 8,
    color: C.ash,
    border: `1px solid ${hexA(C.ash, 0.3)}`,
    padding: "0 3px",
    borderRadius: 2,
  },
  poolTag: {
    fontSize: 7.5,
    letterSpacing: 0.5,
    border: "1px solid",
    padding: "1px 4px",
    borderRadius: 2,
    marginLeft: "auto",
  },
  poolStatus: { fontSize: 9.5, color: C.ash, marginTop: 2, letterSpacing: 0.3 },

  stage: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    background: C.void,
  },
  stageInner: { position: "relative", width: "100%", maxWidth: 900, aspectRatio: `${W} / ${H}` },
  canvas: {
    width: "100%",
    height: "100%",
    display: "block",
    imageRendering: "pixelated",
    border: `1px solid ${hexA(C.sith, 0.25)}`,
    boxShadow: `0 0 40px ${hexA(C.sith, 0.12)}, inset 0 0 60px rgba(0,0,0,0.6)`,
  },
  scanlines: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "repeating-linear-gradient(0deg, rgba(0,0,0,0.14) 0px, rgba(0,0,0,0.14) 1px, transparent 2px, transparent 3px)",
    mixBlendMode: "multiply",
  },
  roomLabel: {
    position: "absolute",
    transform: "translate(-50%, -120%)",
    fontSize: 8.5,
    letterSpacing: 1,
    fontFamily: mono,
    whiteSpace: "nowrap",
    textShadow: "0 0 4px rgba(0,0,0,0.9)",
    pointerEvents: "none",
  },
  bubble: {
    position: "absolute",
    transform: "translate(-50%, -100%)",
    maxWidth: 130,
    fontSize: 8,
    lineHeight: 1.25,
    letterSpacing: 0.2,
    fontFamily: mono,
    color: "#eaf2ec",
    background: "rgba(6,10,8,0.9)",
    border: `1px solid ${hexA(C.bone, 0.5)}`,
    borderRadius: 3,
    padding: "2px 5px",
    whiteSpace: "normal",
    textAlign: "center",
    pointerEvents: "none",
    boxShadow: `0 0 8px rgba(0,0,0,0.7)`,
    animation: "bubbleIn 0.25s ease",
    zIndex: 3,
  },

  right: {
    width: 250,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    background: C.hull,
    borderLeft: `1px solid ${hexA(C.sith, 0.15)}`,
  },
  missions: { flexShrink: 0, maxHeight: "38%", overflowY: "auto" },
  mission: { display: "flex", gap: 7, padding: "5px 12px", alignItems: "baseline" },
  missionIcon: { fontSize: 10, width: 10 },
  missionTxt: { fontSize: 10, letterSpacing: 0.3 },
  log: { flex: 1, overflowY: "auto", padding: "2px 0" },
  logRow: {
    display: "flex",
    gap: 6,
    padding: "3px 12px",
    alignItems: "baseline",
    animation: "logIn 0.3s ease",
  },
  logType: {
    fontSize: 7.5,
    letterSpacing: 0.5,
    border: "1px solid",
    padding: "0 3px",
    borderRadius: 2,
    flexShrink: 0,
  },
  logTxt: { fontSize: 10, color: C.ash, letterSpacing: 0.2 },

  bottombar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderTop: `1px solid ${hexA(C.sith, 0.25)}`,
    background: C.hull,
    flexShrink: 0,
  },
  btn: {
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: 1.5,
    padding: "6px 14px",
    background: "transparent",
    border: "1px solid",
    cursor: "pointer",
    borderRadius: 2,
  },
  buildTag: { marginLeft: "auto", fontSize: 9, letterSpacing: 1.5, color: hexA(C.toxic, 0.7) },
};

const KEYFRAMES = `
@keyframes sithPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
@keyframes logIn { from{opacity:0; transform:translateX(6px)} to{opacity:1; transform:none} }
@keyframes bubbleIn { from{opacity:0; transform:translate(-50%,-90%) scale(0.9)} to{opacity:1; transform:translate(-50%,-100%) scale(1)} }
.dark-station-scroll::-webkit-scrollbar{width:6px;height:6px}
`;
