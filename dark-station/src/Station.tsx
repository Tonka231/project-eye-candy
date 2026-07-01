import type { CSSProperties } from "react";
import { useEffect, useRef, useState, useCallback } from "react";

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
// Doubled from 640×400 to give the pixel art far more detail headroom.
const W = 1280;
const H = 800;

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
    x: 496,
    y: 300,
    w: 300,
    h: 224,
    theme: "green",
    boss: true,
    crew: 3,
  },
  { id: "resA", label: "RECHERCHE α", x: 44, y: 52, w: 244, h: 188, theme: "steel", crew: 4 },
  { id: "resB", label: "RECHERCHE β", x: 44, y: 308, w: 244, h: 188, theme: "violet", crew: 4 },
  { id: "resG", label: "RECHERCHE γ", x: 44, y: 564, w: 244, h: 188, theme: "steel", crew: 4 },
  { id: "fact", label: "FAKTENCHECK", x: 352, y: 48, w: 240, h: 172, theme: "amber", crew: 3 },
  { id: "confl", label: "WIDERSPRUCH", x: 728, y: 48, w: 240, h: 172, theme: "deep", crew: 3 },
  { id: "synth", label: "SYNTHESE", x: 1004, y: 192, w: 232, h: 184, theme: "green", crew: 3 },
  { id: "crit", label: "KRITIKER", x: 1004, y: 448, w: 232, h: 184, theme: "toxic", crew: 3 },
  { id: "cite", label: "ZITATION", x: 728, y: 604, w: 240, h: 148, theme: "amber", crew: 3 },
  { id: "rep", label: "REPORT", x: 364, y: 604, w: 240, h: 148, theme: "ember", crew: 4 },
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

// Overall station footprint — the bounding box of every room plus a margin.
// The hull plate is drawn across this so the modules read as ONE spaceship.
const STATION = (() => {
  const xs = ROOMS.flatMap((r) => [r.x, r.x + r.w]);
  const ys = ROOMS.flatMap((r) => [r.y, r.y + r.h]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);
  const m = 30;
  return { x: x0 - m, y: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m };
})();

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
    x0: r.x + 26,
    y0: r.y + Math.round(r.h * 0.4),
    x1: r.x + r.w - 26,
    y1: r.y + r.h - 22,
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
        spd: boss ? 0.026 : rand(0.032, 0.052),
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
    if (d < 2.5) {
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
    ch.step += mv * 0.32;
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
  ctx.translate(W * 0.42, H * 0.5);
  ctx.rotate(-0.5);
  const band = ctx.createLinearGradient(0, -220, 0, 220);
  band.addColorStop(0, "rgba(120,140,170,0)");
  band.addColorStop(0.5, "rgba(150,165,195,0.15)");
  band.addColorStop(1, "rgba(120,140,170,0)");
  ctx.fillStyle = band;
  ctx.fillRect(-W, -140, W * 2, 280);
  // warm galactic core glow (like the photo's bright bulge)
  const core = ctx.createRadialGradient(-120, 10, 10, -120, 10, 260);
  core.addColorStop(0, "rgba(210,180,140,0.18)");
  core.addColorStop(0.4, "rgba(150,150,170,0.1)");
  core.addColorStop(1, "rgba(200,205,225,0)");
  ctx.fillStyle = core;
  ctx.fillRect(-W, -200, W * 2, 400);
  // a cooler blue cluster further along the band
  const blue = ctx.createRadialGradient(180, -20, 6, 180, -20, 150);
  blue.addColorStop(0, "rgba(120,150,220,0.12)");
  blue.addColorStop(1, "rgba(120,150,220,0)");
  ctx.fillStyle = blue;
  ctx.fillRect(-W, -200, W * 2, 400);
  // dark dust lanes cutting across the band
  ctx.fillStyle = "rgba(4,5,10,0.55)";
  ctx.fillRect(-W, -12, W * 2, 9);
  ctx.fillRect(-W, 26, W * 2, 6);
  ctx.fillRect(-W, 60, W * 2, 4);
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
  // ── the ship itself: external structure, hull plate, spars, then rooms ──
  drawStationExternals(ctx);
  drawStationHull(ctx);
  drawCorridors(ctx);
  for (const r of ROOMS) drawRoom(ctx, r);
}

// Reinforced structural corridors that run across the hull between the modules.
function drawCorridors(ctx: CanvasRenderingContext2D) {
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  for (const [a, b] of EDGES) {
    const pts = edgePath(a, b);
    // outer casing
    polyline(ctx, pts);
    ctx.strokeStyle = "#161a22";
    ctx.lineWidth = 26;
    ctx.stroke();
    // bright structural edges
    polyline(ctx, pts);
    ctx.strokeStyle = hexA(EDGE, 0.35);
    ctx.lineWidth = 26;
    ctx.stroke();
    // dark inner channel
    polyline(ctx, pts);
    ctx.strokeStyle = "#080a10";
    ctx.lineWidth = 20;
    ctx.stroke();
    // dashed centre line
    polyline(ctx, pts);
    ctx.strokeStyle = hexA(C.ash, 0.2);
    ctx.setLineDash([5, 9]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// The unified station hull: one dark armoured plate behind every module with
// plating, seams, rivets and a bright edge trim — turns boxes into a spaceship.
function drawStationHull(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = STATION;
  const rad = 46;
  ctx.save();
  roundRectPath(ctx, x, y, w, h, rad);
  ctx.clip();
  // base plate with a soft vertical bevel
  const grd = ctx.createLinearGradient(0, y, 0, y + h);
  grd.addColorStop(0, "#12161d");
  grd.addColorStop(0.5, "#0c0f15");
  grd.addColorStop(1, "#090c11");
  ctx.fillStyle = grd;
  ctx.fillRect(x, y, w, h);
  // plating seams
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let gx = x + 40; gx < x + w; gx += 56) {
    ctx.beginPath();
    ctx.moveTo(gx + 0.5, y);
    ctx.lineTo(gx + 0.5, y + h);
    ctx.stroke();
  }
  for (let gy = y + 40; gy < y + h; gy += 56) {
    ctx.beginPath();
    ctx.moveTo(x, gy + 0.5);
    ctx.lineTo(x + w, gy + 0.5);
    ctx.stroke();
  }
  // rivets at seam crossings
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let gy = y + 40; gy < y + h; gy += 56)
    for (let gx = x + 40; gx < x + w; gx += 56) ctx.fillRect(gx - 1, gy - 1, 2, 2);
  // inner edge shadow
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 10;
  roundRectPath(ctx, x + 5, y + 5, w - 10, h - 10, rad - 6);
  ctx.stroke();
  ctx.restore();
  // bright hull trim (the ship's outline)
  ctx.strokeStyle = "#05070b";
  ctx.lineWidth = 6;
  roundRectPath(ctx, x, y, w, h, rad);
  ctx.stroke();
  ctx.strokeStyle = hexA(EDGE, 0.55);
  ctx.lineWidth = 2;
  roundRectPath(ctx, x - 1, y - 1, w + 2, h + 2, rad + 1);
  ctx.stroke();
  // corner hazard blocks
  ctx.fillStyle = hexA(C.amber, 0.5);
  for (const [ox, oy] of [
    [x + 10, y + 10],
    [x + w - 26, y + 10],
    [x + 10, y + h - 14],
    [x + w - 26, y + h - 14],
  ])
    ctx.fillRect(ox, oy, 16, 4);
}

// External ship structure hung off the hull edges: comms dish, antenna masts,
// docking arms and an engine block — so it clearly reads as a vessel in space.
function drawStationExternals(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = STATION;
  const strut = "#141821";
  const strutHi = "#232a35";

  // helper: a boxy strut with a highlighted top edge
  const bar = (bx: number, by: number, bw: number, bh: number) => {
    ctx.fillStyle = strut;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = strutHi;
    ctx.fillRect(bx, by, bw, 1);
  };

  // ── comms dish, top-left (like the video) ──
  const dx = x + 46;
  const dy = y - 30;
  bar(dx - 2, dy, 4, 40); // mast
  ctx.strokeStyle = strutHi;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(dx, dy - 4, 22, Math.PI * 0.15, Math.PI * 0.85, false); // dish bowl
  ctx.stroke();
  ctx.strokeStyle = hexA(EDGE, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(dx, dy - 4, 22, Math.PI * 0.15, Math.PI * 0.85, false);
  ctx.stroke();
  ctx.fillStyle = hexA(C.amber, 0.9);
  ctx.fillRect(dx - 1, dy - 10, 2, 2); // feed horn

  // ── antenna masts along the top ──
  for (const ax of [x + w * 0.5, x + w * 0.78]) {
    bar(ax, y - 24, 2, 24);
    ctx.fillStyle = hexA(C.scan, 0.9);
    ctx.fillRect(ax - 1, y - 26, 4, 3);
  }

  // ── docking arms on the sides ──
  for (const side of [-1, 1]) {
    const ax = side < 0 ? x - 26 : x + w + 2;
    const ay = y + h * 0.42;
    bar(ax, ay, 26, 10); // arm
    bar(side < 0 ? ax - 6 : ax + 26, ay - 8, 6, 26); // clamp head
    ctx.fillStyle = hexA(EDGE, 0.6);
    ctx.fillRect(side < 0 ? ax - 6 : ax + 26, ay + 2, 6, 2);
  }

  // ── engine block along the bottom, with nozzle glow ──
  const ey = y + h;
  for (let i = 0; i < 5; i++) {
    const ex = x + w * (0.2 + i * 0.15);
    bar(ex - 14, ey, 28, 16); // housing
    ctx.fillStyle = "#05070b";
    ctx.fillRect(ex - 9, ey + 12, 18, 8); // nozzle mouth
    const gl = ctx.createRadialGradient(ex, ey + 20, 2, ex, ey + 20, 16);
    gl.addColorStop(0, hexA(EDGE, 0.5));
    gl.addColorStop(1, hexA(EDGE, 0));
    ctx.fillStyle = gl;
    ctx.fillRect(ex - 16, ey + 12, 32, 22);
  }

  // ── a few hull greebles / running lights around the frame ──
  ctx.fillStyle = hexA(C.toxic, 0.8);
  ctx.fillRect(x + w * 0.33, y - 4, 3, 3);
  ctx.fillStyle = hexA(C.scan, 0.8);
  ctx.fillRect(x + w * 0.66, y + h + 1, 3, 3);
}

// All recognisable objects a room scene can be built from.
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
  | "barrel"
  | "throne"
  | "holotable"
  | "bookshelf"
  | "datacore"
  | "dish"
  | "evidenceboard"
  | "twinscreens"
  | "forge"
  | "pedestal"
  | "filecabinet"
  | "press"
  | "ledger";

// Rounded-rectangle path helper (falls back gracefully on older canvases).
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number,
) {
  const rr = Math.min(rad, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, rr);
  } else {
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

// Thick dark station hull around a room: rounded metal frame with a bevel, a
// bright inner edge and small corner tech notches — the video's chunky border.
function drawHull(ctx: CanvasRenderingContext2D, r: Room, tint: string) {
  ctx.save();
  ctx.lineJoin = "round";
  // outer dark metal frame
  ctx.strokeStyle = "#0b0d13";
  ctx.lineWidth = 8;
  roundRectPath(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 12);
  ctx.stroke();
  // lighter bevel highlight
  ctx.strokeStyle = "#20242e";
  ctx.lineWidth = 2;
  roundRectPath(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 12);
  ctx.stroke();
  // bright inner edge (cyan)
  ctx.strokeStyle = hexA(EDGE, 0.7);
  ctx.lineWidth = 1;
  roundRectPath(ctx, r.x + 8, r.y + 8, r.w - 16, r.h - 16, 7);
  ctx.stroke();
  ctx.restore();
  // corner tech notches
  ctx.fillStyle = hexA(tint, 0.8);
  const n = 6;
  for (const [ox, oy] of [
    [r.x + 6, r.y + 6],
    [r.x + r.w - 6 - n, r.y + 6],
    [r.x + 6, r.y + r.h - 6 - 2],
    [r.x + r.w - 6 - n, r.y + r.h - 6 - 2],
  ]) {
    ctx.fillRect(ox, oy, n, 2);
  }
}

function drawRoom(ctx: CanvasRenderingContext2D, r: Room) {
  const th = ROOM_THEME[r.theme];
  // clip everything to a rounded rectangle so the module has soft corners
  ctx.save();
  roundRectPath(ctx, r.x, r.y, r.w, r.h, 12);
  ctx.clip();

  // floor base + a tinted radial vignette so the interior glows from the middle
  ctx.fillStyle = th.floor;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const vg = ctx.createRadialGradient(cx(r), cy(r), 6, cx(r), cy(r), r.w * 0.7);
  vg.addColorStop(0, hexA(th.tint, 0.14));
  vg.addColorStop(1, hexA(th.tint, 0));
  ctx.fillStyle = vg;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // clean floor
  drawRoomDetail(ctx, r, th.tint);

  // row of readout screens along the top wall
  drawTopScreens(ctx, r, th.tint);

  // the room's unique hand-authored scene
  drawScene(ctx, r, th.tint);

  // bright horizontal light bar across the upper third (the clip's cyan strip)
  const barY = Math.round(r.y + r.h * 0.32);
  ctx.fillStyle = hexA(EDGE, 0.16);
  ctx.fillRect(r.x + 10, barY - 3, r.w - 20, 7);
  ctx.fillStyle = hexA(EDGE, 0.95);
  ctx.fillRect(r.x + 12, barY, r.w - 24, 2);

  ctx.restore();

  // thick dark hull frame on top (rounded metal border)
  drawHull(ctx, r, th.tint);
}

// A strip of small monitors just inside the top wall, each with tiny readouts.
function drawTopScreens(ctx: CanvasRenderingContext2D, r: Room, tint: string) {
  const y = r.y + 12;
  const n = Math.max(3, Math.floor(r.w / 46));
  const gap = (r.w - 24) / n;
  for (let i = 0; i < n; i++) {
    const x = Math.round(r.x + 16 + gap * i);
    const w = Math.round(gap - 8);
    ctx.fillStyle = "#0a0d13";
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = hexA(i % 3 === 0 ? C.toxic : tint, 0.35);
    ctx.fillRect(x + 1, y + 1, w - 2, 10);
    ctx.fillStyle = hexA(i % 3 === 0 ? C.toxic : tint, 0.9);
    for (let ly = y + 2; ly < y + 11; ly += 2)
      ctx.fillRect(x + 2, ly, 2 + (((x + ly) * 5) % (w - 4)), 1);
  }
}

// A CLEAN floor: subtle panel grid, a walkway seam and a wall hazard stripe.
// No random micro-components — the hand-authored scene props carry the room.
function drawRoomDetail(ctx: CanvasRenderingContext2D, r: Room, tint: string) {
  const top = r.y + 26;
  const bot = r.y + r.h - 12;
  const left = r.x + 12;
  const right = r.x + r.w - 12;
  // subtle floor panel grid (large tiles)
  ctx.strokeStyle = hexA(tint, 0.05);
  ctx.lineWidth = 1;
  for (let gx = left; gx < right; gx += 30) {
    ctx.beginPath();
    ctx.moveTo(gx + 0.5, top);
    ctx.lineTo(gx + 0.5, bot);
    ctx.stroke();
  }
  for (let gy = top; gy < bot; gy += 30) {
    ctx.beginPath();
    ctx.moveTo(left, gy + 0.5);
    ctx.lineTo(right, gy + 0.5);
    ctx.stroke();
  }
  // side conduits
  ctx.fillStyle = hexA(tint, 0.16);
  ctx.fillRect(r.x + 9, top, 2, bot - top);
  ctx.fillRect(r.x + r.w - 11, top, 2, bot - top);
  // hazard stripe along the bottom wall
  ctx.fillStyle = hexA(C.amber, 0.12);
  for (let sx0 = left; sx0 < right - 4; sx0 += 12) ctx.fillRect(sx0, bot - 2, 6, 2);
}

// ── each room is a hand-authored scene with its own centrepiece (x,y are
// fractions 0..1 of the usable floor) so no two rooms look alike ──
interface SceneItem {
  kind: Prop;
  x: number;
  y: number;
}
const ROOM_SCENE: Record<string, SceneItem[]> = {
  cmd: [
    { kind: "screen", x: 0.08, y: 0.02 },
    { kind: "screen", x: 0.78, y: 0.02 },
    { kind: "throne", x: 0.44, y: 0.05 },
    { kind: "holotable", x: 0.36, y: 0.45 },
    { kind: "console", x: 0.05, y: 0.62 },
    { kind: "console", x: 0.82, y: 0.62 },
  ],
  resA: [
    { kind: "bookshelf", x: 0.06, y: 0.05 },
    { kind: "bookshelf", x: 0.06, y: 0.55 },
    { kind: "bookshelf", x: 0.74, y: 0.05 },
    { kind: "bookshelf", x: 0.74, y: 0.55 },
    { kind: "desk", x: 0.4, y: 0.62 },
  ],
  resB: [
    { kind: "datacore", x: 0.4, y: 0.32 },
    { kind: "console", x: 0.06, y: 0.28 },
    { kind: "console", x: 0.82, y: 0.28 },
    { kind: "desk", x: 0.08, y: 0.66 },
    { kind: "desk", x: 0.78, y: 0.66 },
  ],
  resG: [
    { kind: "dish", x: 0.38, y: 0.08 },
    { kind: "screen", x: 0.78, y: 0.28 },
    { kind: "console", x: 0.1, y: 0.62 },
    { kind: "console", x: 0.42, y: 0.66 },
    { kind: "console", x: 0.72, y: 0.62 },
  ],
  fact: [
    { kind: "evidenceboard", x: 0.06, y: 0.06 },
    { kind: "table", x: 0.44, y: 0.5 },
    { kind: "desk", x: 0.72, y: 0.5 },
    { kind: "screen", x: 0.74, y: 0.04 },
  ],
  confl: [
    { kind: "twinscreens", x: 0.3, y: 0.32 },
    { kind: "console", x: 0.06, y: 0.6 },
    { kind: "console", x: 0.8, y: 0.6 },
    { kind: "barrel", x: 0.46, y: 0.7 },
  ],
  synth: [
    { kind: "forge", x: 0.38, y: 0.4 },
    { kind: "reactor", x: 0.06, y: 0.42 },
    { kind: "reactor", x: 0.82, y: 0.42 },
    { kind: "desk", x: 0.42, y: 0.72 },
  ],
  crit: [
    { kind: "pedestal", x: 0.42, y: 0.42 },
    { kind: "console", x: 0.08, y: 0.58 },
    { kind: "console", x: 0.78, y: 0.58 },
    { kind: "screen", x: 0.42, y: 0.04 },
  ],
  cite: [
    { kind: "filecabinet", x: 0.08, y: 0.28 },
    { kind: "filecabinet", x: 0.28, y: 0.28 },
    { kind: "filecabinet", x: 0.08, y: 0.62 },
    { kind: "filecabinet", x: 0.28, y: 0.62 },
    { kind: "ledger", x: 0.62, y: 0.5 },
    { kind: "desk", x: 0.76, y: 0.58 },
  ],
  rep: [
    { kind: "press", x: 0.32, y: 0.36 },
    { kind: "crate", x: 0.74, y: 0.5 },
    { kind: "crate", x: 0.82, y: 0.66 },
    { kind: "desk", x: 0.08, y: 0.58 },
  ],
};

// Draw a room's authored scene, back-to-front by y for correct overlap.
function drawScene(ctx: CanvasRenderingContext2D, r: Room, tint: string) {
  const items = ROOM_SCENE[r.id] ?? [];
  const placed = items.map((it) => ({
    kind: it.kind,
    px: Math.round(r.x + 18 + it.x * (r.w - 44)),
    py: Math.round(r.y + r.h * 0.18 + it.y * (r.h * 0.66)),
  }));
  placed.sort((a, b) => a.py - b.py);
  for (const it of placed) drawProp(ctx, it.kind, it.px, it.py, tint);
}

// ── procedural pixel furniture (copyright-clean, drawn by hand) ──
function drawProp(ctx: CanvasRenderingContext2D, kind: Prop, x: number, y: number, color: string) {
  const shadow = () => {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
  };
  switch (kind) {
    case "rack": {
      // tall server cabinet, 18×30, lit slats + top status light
      shadow();
      ctx.fillRect(x + 2, y + 28, 18, 3);
      ctx.fillStyle = "#0e1119";
      ctx.fillRect(x, y, 18, 28);
      ctx.fillStyle = "#05070c";
      ctx.fillRect(x + 2, y + 2, 14, 24);
      for (let ry = y + 4; ry < y + 25; ry += 4) {
        ctx.fillStyle = shade(color, 0.6);
        ctx.fillRect(x + 3, ry, 12, 2);
        ctx.fillStyle = hexA(color, 0.95);
        ctx.fillRect(x + 4, ry, 2, 2);
        ctx.fillStyle = hexA(C.amber, 0.8);
        ctx.fillRect(x + 12, ry, 1, 1);
      }
      ctx.fillStyle = hexA(color, 0.9);
      ctx.fillRect(x + 6, y - 1, 6, 1); // top glow bar
      break;
    }
    case "console": {
      // control desk, 24×20, angled lit screen + button row
      shadow();
      ctx.fillRect(x + 1, y + 18, 24, 3);
      ctx.fillStyle = "#12161d";
      ctx.fillRect(x, y + 10, 24, 9); // desk body
      ctx.fillStyle = "#0a0d14";
      ctx.fillRect(x + 2, y, 20, 10); // screen bezel
      ctx.fillStyle = hexA(color, 0.5);
      ctx.fillRect(x + 3, y + 1, 18, 7); // screen
      ctx.fillStyle = hexA(color, 0.95);
      ctx.fillRect(x + 5, y + 3, 8, 1);
      ctx.fillRect(x + 5, y + 5, 5, 1);
      // button row
      for (let bx = x + 3; bx < x + 21; bx += 3) {
        ctx.fillStyle = hexA(Math.random() < 0.5 ? color : C.amber, 0.7);
        ctx.fillRect(bx, y + 12, 2, 2);
      }
      break;
    }
    case "reactor": {
      // glowing power core, 24×24
      shadow();
      ctx.fillRect(x, y + 22, 24, 3);
      ctx.fillStyle = "#0b0e16";
      ctx.fillRect(x, y, 24, 24);
      ctx.fillStyle = "#05070c";
      ctx.fillRect(x + 2, y + 2, 20, 20);
      ctx.fillStyle = shade(color, 0.5);
      ctx.fillRect(x + 5, y + 5, 14, 14);
      ctx.fillStyle = hexA(color, 0.85);
      ctx.fillRect(x + 10, y + 3, 4, 18); // cross
      ctx.fillRect(x + 3, y + 10, 18, 4);
      ctx.fillStyle = "#fff";
      ctx.fillRect(x + 10, y + 10, 4, 4); // hot centre
      // corner bolts
      ctx.fillStyle = shade(color, 0.7);
      for (const [bx, by] of [
        [x + 2, y + 2],
        [x + 20, y + 2],
        [x + 2, y + 20],
        [x + 20, y + 20],
      ])
        ctx.fillRect(bx, by, 2, 2);
      break;
    }
    case "crate": {
      // stacked supply crates, 18×18
      shadow();
      ctx.fillRect(x + 1, y + 16, 18, 3);
      ctx.fillStyle = "#2a2016";
      ctx.fillRect(x, y, 18, 18);
      ctx.fillStyle = "#3a2c1c";
      ctx.fillRect(x + 1, y + 1, 16, 16);
      ctx.strokeStyle = "#15100a";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1.5, y + 1.5, 15, 15);
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + 16, y + 16);
      ctx.moveTo(x + 16, y + 2);
      ctx.lineTo(x + 2, y + 16);
      ctx.stroke();
      ctx.fillStyle = hexA(C.amber, 0.7); // label
      ctx.fillRect(x + 6, y + 8, 6, 2);
      break;
    }
    case "pod": {
      // sleep capsule, 28×16, glass with occupant silhouette
      shadow();
      ctx.fillRect(x, y + 14, 28, 3);
      ctx.fillStyle = "#0d1018";
      ctx.fillRect(x, y + 2, 28, 12);
      ctx.fillStyle = hexA(color, 0.3);
      ctx.fillRect(x + 2, y + 4, 24, 8); // glass
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x + 8, y + 6, 12, 4); // occupant
      ctx.fillStyle = hexA(color, 0.85);
      ctx.fillRect(x + 2, y + 4, 24, 1); // rim light
      ctx.fillStyle = hexA(C.amber, 0.8);
      ctx.fillRect(x + 24, y + 8, 2, 2); // status led
      break;
    }
    case "screen": {
      // wall monitor bank, 24×16
      shadow();
      ctx.fillStyle = "#0d1018";
      ctx.fillRect(x, y, 24, 16);
      ctx.fillStyle = hexA(color, 0.4);
      ctx.fillRect(x + 2, y + 2, 20, 12);
      ctx.fillStyle = hexA(color, 0.9);
      for (let ly = y + 3; ly < y + 13; ly += 2) ctx.fillRect(x + 3, ly, 4 + ((ly * 7) % 14), 1);
      ctx.strokeStyle = shade(color, 0.6);
      ctx.strokeRect(x + 0.5, y + 0.5, 23, 15);
      break;
    }
    case "plant": {
      // hydroponic plant, 14×22
      ctx.fillStyle = "#241a10";
      ctx.fillRect(x + 2, y + 14, 10, 8); // pot
      ctx.fillStyle = "#1a130a";
      ctx.fillRect(x + 2, y + 14, 10, 2);
      ctx.fillStyle = shade(C.toxic, 0.75);
      ctx.fillRect(x + 1, y + 4, 12, 11); // foliage
      ctx.fillStyle = hexA(C.toxic, 0.9);
      ctx.fillRect(x + 4, y, 6, 6);
      ctx.fillRect(x + 2, y + 6, 3, 4);
      ctx.fillRect(x + 9, y + 6, 3, 4);
      break;
    }
    case "desk": {
      // operator workstation, 26×20: desk + monitor + seat + keyboard
      shadow();
      ctx.fillRect(x, y + 18, 26, 3);
      ctx.fillStyle = "#12161d";
      ctx.fillRect(x, y + 8, 26, 10); // desk top
      ctx.fillStyle = "#0a0d13";
      ctx.fillRect(x, y + 17, 26, 1);
      ctx.fillStyle = "#05070c"; // monitor back
      ctx.fillRect(x + 5, y, 16, 9);
      ctx.fillStyle = hexA(color, 0.6); // screen
      ctx.fillRect(x + 6, y + 1, 14, 6);
      ctx.fillStyle = hexA(color, 0.95);
      ctx.fillRect(x + 8, y + 3, 4, 1);
      ctx.fillRect(x + 8, y + 5, 7, 1);
      ctx.fillStyle = "#1a1f26"; // keyboard
      ctx.fillRect(x + 8, y + 11, 10, 3);
      ctx.fillStyle = "#2a3038"; // seat
      ctx.fillRect(x + 9, y + 20, 8, 4);
      break;
    }
    case "chair": {
      ctx.fillStyle = "#2a3038";
      ctx.fillRect(x + 3, y + 6, 10, 6); // seat
      ctx.fillStyle = "#1a1f26";
      ctx.fillRect(x + 3, y + 2, 10, 4); // backrest
      ctx.fillStyle = "#0a0d13";
      ctx.fillRect(x + 7, y + 12, 3, 4); // stem
      ctx.fillRect(x + 4, y + 15, 9, 1); // base
      break;
    }
    case "table": {
      // work table with scattered items, 26×18
      shadow();
      ctx.fillRect(x, y + 16, 26, 3);
      ctx.fillStyle = "#161b12";
      ctx.fillRect(x, y + 4, 26, 12);
      ctx.fillStyle = "#0e120c";
      ctx.fillRect(x, y + 15, 26, 1);
      ctx.fillStyle = hexA(color, 0.8);
      ctx.fillRect(x + 4, y + 7, 3, 3); // beaker
      ctx.fillStyle = hexA(C.amber, 0.85);
      ctx.fillRect(x + 12, y + 8, 4, 2); // tool
      ctx.fillStyle = "#8a94a0";
      ctx.fillRect(x + 19, y + 6, 4, 4); // box
      ctx.fillStyle = hexA(C.scan, 0.6);
      ctx.fillRect(x + 9, y + 6, 1, 1);
      break;
    }
    case "tank": {
      // containment cylinder, 16×28, glowing liquid + bubbles
      shadow();
      ctx.fillRect(x, y + 26, 16, 3);
      ctx.fillStyle = "#0a0e14";
      ctx.fillRect(x + 2, y, 12, 28);
      ctx.fillStyle = "#05080c";
      ctx.fillRect(x + 2, y, 2, 28);
      ctx.fillStyle = hexA(color, 0.4);
      ctx.fillRect(x + 4, y + 4, 9, 20); // liquid
      ctx.fillStyle = hexA(color, 0.85);
      ctx.fillRect(x + 5, y + 5, 2, 16); // highlight
      ctx.fillStyle = hexA(color, 0.6);
      ctx.fillRect(x + 9, y + 9, 1, 1); // bubbles
      ctx.fillRect(x + 10, y + 15, 1, 1);
      ctx.fillStyle = "#1a1f28"; // caps
      ctx.fillRect(x + 1, y, 14, 3);
      ctx.fillRect(x + 1, y + 25, 14, 3);
      break;
    }
    case "barrel": {
      // hazard barrel, 16×22
      shadow();
      ctx.fillRect(x, y + 20, 16, 3);
      ctx.fillStyle = "#2f2416";
      ctx.fillRect(x + 2, y + 2, 12, 18);
      ctx.fillStyle = "#4a3826";
      ctx.fillRect(x + 3, y + 2, 10, 18);
      ctx.fillStyle = "#15100a"; // rings
      ctx.fillRect(x + 2, y + 6, 12, 1);
      ctx.fillRect(x + 2, y + 14, 12, 1);
      ctx.fillStyle = hexA(C.amber, 0.8); // hazard mark
      ctx.fillRect(x + 6, y + 9, 4, 4);
      ctx.fillStyle = "#15100a";
      ctx.fillRect(x + 7, y + 10, 2, 2);
      break;
    }
    case "throne": {
      // commander's high-backed command seat, 18×22
      shadow();
      ctx.fillRect(x, y + 20, 18, 3);
      ctx.fillStyle = "#1a1e28";
      ctx.fillRect(x + 2, y + 8, 14, 12);
      ctx.fillStyle = "#0d1017";
      ctx.fillRect(x + 3, y, 12, 10); // high back
      ctx.fillStyle = hexA(color, 0.85);
      ctx.fillRect(x + 5, y + 2, 8, 2); // crest light
      ctx.fillStyle = hexA(color, 0.5);
      ctx.fillRect(x + 4, y + 12, 10, 3);
      break;
    }
    case "holotable": {
      // central strategy table with a holographic dome, 44×22
      shadow();
      ctx.fillRect(x, y + 16, 44, 4);
      ctx.fillStyle = "#12161d";
      ctx.fillRect(x + 4, y + 12, 36, 8);
      ctx.fillStyle = "#0a0d13";
      ctx.fillRect(x + 6, y + 18, 32, 2);
      const hg = ctx.createRadialGradient(x + 22, y + 8, 2, x + 22, y + 8, 22);
      hg.addColorStop(0, hexA(color, 0.6));
      hg.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = hg;
      ctx.fillRect(x - 2, y - 8, 48, 28);
      ctx.strokeStyle = hexA(color, 0.85);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x + 22, y + 9, 14, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x + 22, y + 6, 8, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillRect(x + 21, y + 4, 2, 2);
      break;
    }
    case "bookshelf": {
      // tall archive shelf with coloured spines, 22×32
      shadow();
      ctx.fillRect(x, y + 30, 22, 3);
      ctx.fillStyle = "#14100a";
      ctx.fillRect(x, y, 22, 31);
      ctx.fillStyle = "#0a0806";
      ctx.fillRect(x + 1, y + 1, 20, 29);
      const spines = [color, C.amber, C.steel, C.toxic, C.ember, C.violet];
      for (let sy = y + 2; sy < y + 29; sy += 7) {
        ctx.fillStyle = "#0d0a07";
        ctx.fillRect(x + 1, sy + 5, 20, 1);
        for (let sx = x + 2; sx < x + 20; sx += 3) {
          ctx.fillStyle = hexA(spines[(sx + sy) % spines.length], 0.7);
          ctx.fillRect(sx, sy, 2, 5);
        }
      }
      break;
    }
    case "datacore": {
      // glowing central data tower, 24×40
      shadow();
      ctx.fillRect(x, y + 38, 26, 4);
      ctx.fillStyle = "#0a0e15";
      ctx.fillRect(x + 2, y, 20, 38);
      ctx.fillStyle = "#05070c";
      ctx.fillRect(x + 4, y + 2, 16, 34);
      for (let by = y + 4; by < y + 35; by += 5) {
        ctx.fillStyle = hexA(color, 0.7);
        ctx.fillRect(x + 5, by, 14, 2);
        ctx.fillStyle = hexA(color, 0.95);
        ctx.fillRect(x + 5, by, 3, 2);
      }
      const cg = ctx.createLinearGradient(x, y, x, y + 38);
      cg.addColorStop(0, hexA(color, 0.2));
      cg.addColorStop(0.5, hexA(color, 0.95));
      cg.addColorStop(1, hexA(color, 0.2));
      ctx.fillStyle = cg;
      ctx.fillRect(x + 11, y + 2, 2, 34);
      break;
    }
    case "dish": {
      // scanning dish array, 30×24
      shadow();
      ctx.fillRect(x + 10, y + 20, 10, 3);
      ctx.fillStyle = "#1a1e28";
      ctx.fillRect(x + 12, y + 10, 6, 12);
      ctx.strokeStyle = "#2a3140";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + 15, y + 12, 13, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.strokeStyle = hexA(color, 0.6);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + 15, y + 12, 13, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.fillStyle = hexA(C.scan, 0.9);
      ctx.fillRect(x + 14, y, 2, 3);
      break;
    }
    case "evidenceboard": {
      // pinboard with notes + threads, 34×24
      shadow();
      ctx.fillStyle = "#0c0f15";
      ctx.fillRect(x, y, 34, 24);
      ctx.fillStyle = "#171b22";
      ctx.fillRect(x + 1, y + 1, 32, 22);
      for (const [nx, ny] of [
        [4, 4],
        [14, 3],
        [24, 5],
        [7, 13],
        [18, 14],
        [27, 12],
      ] as const) {
        ctx.fillStyle = hexA(C.amber, 0.85);
        ctx.fillRect(x + nx, y + ny, 5, 4);
      }
      ctx.strokeStyle = hexA(C.scan, 0.7);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + 20, y + 16);
      ctx.lineTo(x + 26, y + 6);
      ctx.moveTo(x + 16, y + 5);
      ctx.lineTo(x + 9, y + 15);
      ctx.stroke();
      break;
    }
    case "twinscreens": {
      // two opposing screens with a red clash between, 40×22
      shadow();
      ctx.fillStyle = "#0d1018";
      ctx.fillRect(x, y + 2, 12, 18);
      ctx.fillRect(x + 28, y + 2, 12, 18);
      ctx.fillStyle = hexA(C.deep, 0.5);
      ctx.fillRect(x + 1, y + 3, 10, 16);
      ctx.fillRect(x + 29, y + 3, 10, 16);
      ctx.fillStyle = hexA(C.deep, 0.9);
      for (let ly = y + 4; ly < y + 18; ly += 3) {
        ctx.fillRect(x + 2, ly, 8, 1);
        ctx.fillRect(x + 30, ly, 8, 1);
      }
      const sg = ctx.createRadialGradient(x + 20, y + 11, 1, x + 20, y + 11, 12);
      sg.addColorStop(0, hexA(C.scan, 0.9));
      sg.addColorStop(1, hexA(C.scan, 0));
      ctx.fillStyle = sg;
      ctx.fillRect(x + 8, y - 1, 24, 24);
      ctx.fillStyle = "#fff";
      ctx.fillRect(x + 19, y + 6, 2, 10);
      break;
    }
    case "forge": {
      // synthesis crucible with molten core + converging pipes, 30×28
      shadow();
      ctx.fillRect(x, y + 24, 30, 4);
      ctx.fillStyle = hexA(color, 0.4);
      ctx.fillRect(x - 10, y + 12, 12, 3);
      ctx.fillRect(x + 28, y + 12, 12, 3);
      ctx.fillStyle = "#0c1017";
      ctx.fillRect(x + 4, y + 4, 22, 22);
      ctx.fillStyle = "#05070c";
      ctx.fillRect(x + 6, y + 6, 18, 18);
      const fg = ctx.createRadialGradient(x + 15, y + 15, 2, x + 15, y + 15, 12);
      fg.addColorStop(0, "#fff");
      fg.addColorStop(0.4, hexA(color, 0.95));
      fg.addColorStop(1, hexA(color, 0.1));
      ctx.fillStyle = fg;
      ctx.fillRect(x + 5, y + 5, 20, 20);
      break;
    }
    case "pedestal": {
      // test pedestal under a harsh spotlight, 16×24
      const spg = ctx.createLinearGradient(x + 8, y - 6, x + 8, y + 18);
      spg.addColorStop(0, hexA(color, 0.5));
      spg.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = spg;
      ctx.beginPath();
      ctx.moveTo(x + 6, y - 6);
      ctx.lineTo(x + 10, y - 6);
      ctx.lineTo(x + 16, y + 18);
      ctx.lineTo(x, y + 18);
      ctx.closePath();
      ctx.fill();
      shadow();
      ctx.fillRect(x + 2, y + 18, 14, 3);
      ctx.fillStyle = "#1a1e28";
      ctx.fillRect(x + 4, y + 10, 8, 9);
      ctx.fillStyle = "#0d1017";
      ctx.fillRect(x + 3, y + 8, 10, 2);
      ctx.fillStyle = hexA(color, 0.9);
      ctx.fillRect(x + 6, y + 4, 4, 5);
      ctx.fillStyle = "#fff";
      ctx.fillRect(x + 7, y + 5, 2, 2);
      break;
    }
    case "filecabinet": {
      // archive drawers, 16×22
      shadow();
      ctx.fillRect(x, y + 20, 16, 3);
      ctx.fillStyle = "#12161d";
      ctx.fillRect(x, y, 16, 20);
      for (let dy = y + 2; dy < y + 19; dy += 5) {
        ctx.fillStyle = "#0b0e14";
        ctx.fillRect(x + 1, dy, 14, 4);
        ctx.fillStyle = hexA(color, 0.8);
        ctx.fillRect(x + 6, dy + 1, 4, 1);
      }
      break;
    }
    case "press": {
      // printing press with a paper stream, 34×26
      shadow();
      ctx.fillRect(x, y + 22, 34, 4);
      ctx.fillStyle = "#161a22";
      ctx.fillRect(x + 2, y + 4, 30, 18);
      ctx.fillStyle = "#0a0d13";
      ctx.fillRect(x + 4, y + 6, 26, 8);
      ctx.fillStyle = hexA(color, 0.8);
      ctx.fillRect(x + 6, y + 9, 22, 2);
      ctx.fillStyle = "#e8ecf2"; // paper
      ctx.fillRect(x + 8, y + 16, 18, 10);
      ctx.fillStyle = "#c0c6d0";
      for (let ly = y + 18; ly < y + 25; ly += 2) ctx.fillRect(x + 10, ly, 14, 1);
      ctx.fillStyle = hexA(C.amber, 0.8);
      ctx.fillRect(x + 28, y + 6, 2, 2);
      break;
    }
    case "ledger": {
      // big open reference book on a stand, 22×16
      shadow();
      ctx.fillRect(x, y + 13, 22, 3);
      ctx.fillStyle = "#1a140c";
      ctx.fillRect(x + 2, y + 10, 18, 4);
      ctx.fillStyle = "#e8ecf2";
      ctx.fillRect(x + 1, y + 2, 20, 8);
      ctx.fillStyle = "#b8bec8";
      ctx.fillRect(x + 10, y + 2, 2, 8);
      ctx.fillStyle = hexA(color, 0.7);
      for (let ly = y + 4; ly < y + 9; ly += 2) {
        ctx.fillRect(x + 3, ly, 6, 1);
        ctx.fillRect(x + 13, ly, 6, 1);
      }
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
    // cyan frame glow (rounded to match the hull)
    ctx.strokeStyle = hexA(EDGE, 0.14 + 0.4 * glow);
    ctx.lineWidth = 2;
    roundRectPath(ctx, r.x + 3, r.y + 3, r.w - 6, r.h - 6, 12);
    ctx.stroke();
    if (heat > 0.05) {
      // tinted outer halo + the signature big radial room glow
      ctx.strokeStyle = hexA(th.tint, 0.3 * heat);
      roundRectPath(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 14);
      ctx.stroke();
      const rg = ctx.createRadialGradient(cx(r), cy(r), 2, cx(r), cy(r), r.w * 0.62);
      rg.addColorStop(0, hexA(th.tint, 0.55 * Math.min(1, heat)));
      rg.addColorStop(0.6, hexA(th.tint, 0.12 * Math.min(1, heat)));
      rg.addColorStop(1, hexA(th.tint, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
    }
    // red horizontal scan beam (gently bobbing, brighter with activity)
    const beamY = Math.round(r.y + r.h * 0.55 + Math.sin(now / 700 + r.x) * 6);
    ctx.fillStyle = hexA(C.scan, 0.1);
    ctx.fillRect(r.x + 10, beamY - 2, r.w - 20, 5);
    ctx.fillStyle = hexA(C.scan, 0.4 + 0.35 * heat + 0.1 * Math.sin(now / 130));
    ctx.fillRect(r.x + 10, beamY, r.w - 20, 1);
    // blinking status LEDs along the top wall
    const nLed = 6;
    const step = (r.w - 24) / nLed;
    for (let i = 0; i < nLed; i++) {
      const on = (now / 240 + i * 1.7 + r.y) % 3 < 1.4;
      if (on) {
        ctx.fillStyle = hexA(i % 2 ? C.amber : EDGE, 0.85);
        ctx.fillRect(Math.round(r.x + 14 + step * i), r.y + 14, 3, 3);
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
    ctx.fillStyle = hexA(b.color, 0.16);
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.fillStyle = hexA(b.color, 0.5);
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 1, y - 1, 2, 2);
    for (let k = 1; k <= 4; k++) {
      const [tx, ty] = walk(b.pts, Math.max(0, b.t - k * 0.018));
      ctx.fillStyle = hexA(b.color, 0.16 / k);
      ctx.fillRect(tx - 2, ty - 2, 4, 4);
    }
  }

  ctx.globalCompositeOperation = "source-over";
  drawMinimap(ctx, active, now);
}

function drawCharGlow(ctx: CanvasRenderingContext2D, ch: Character, now: number, heat: number) {
  const b = ch.boss;
  const pulse = 0.55 + 0.45 * Math.sin(now / (b ? 300 : 520) + ch.wob);
  const cy0 = ch.y - (b ? 16 : 11);
  // base aura
  const rx = b ? 20 : 11;
  ctx.fillStyle = hexA(ch.color, (b ? 0.15 : 0.08) * (0.6 + 0.4 * pulse));
  ctx.fillRect(ch.x - rx, cy0 - rx, rx * 2, rx * 2);
  // large radial glow when the crew's room is active — the signature look
  const act = Math.min(1, heat);
  if (act > 0.05 || b) {
    const R = (b ? 52 : 34) * (0.7 + 0.5 * act);
    const g = ctx.createRadialGradient(ch.x, cy0, 1, ch.x, cy0, R);
    g.addColorStop(0, hexA(ch.color, (0.18 + 0.4 * act) * (0.7 + 0.3 * pulse)));
    g.addColorStop(0.5, hexA(ch.color, 0.1 * (0.5 + act)));
    g.addColorStop(1, hexA(ch.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(ch.x - R, cy0 - R, R * 2, R * 2);
  }
}

// A bio-mechanical alien with a 2-frame walk cycle — hunched carapace, spiked
// shoulders, elongated back-swept skull, glowing eye and a curling tail.
// ch.(x,y) is the feet centre.
function drawCharBody(ctx: CanvasRenderingContext2D, ch: Character, now: number) {
  const b = ch.boss;
  const moving = ch.idle <= 0;
  const phase = Math.floor(ch.step) % 2;
  const x = Math.round(ch.x);
  const y = Math.round(ch.y);
  const dir = ch.face < 0 ? -1 : 1;
  const k = b ? 1.7 : 1;
  const S = (v: number) => Math.round(v * k);
  const px = (rx: number, ry: number, w: number, h: number) =>
    ctx.fillRect(x + rx, y + ry, Math.max(1, w), Math.max(1, h));

  // palette — dark chitin, pale bone armour, red accents, tint glow
  const cara = "#16121e";
  const caraM = b ? "#37202f" : "#282235";
  const bone = "#dde1ec";
  const boneSh = "#9096ab";
  const red = b ? "#e6273f" : "#a53149";
  const glow = ch.color;

  const legH = S(6);
  const torH = S(9);
  const torW = S(8);
  const headH = S(7);
  const breathe = !moving && Math.sin(now / 500 + ch.wob) > 0 ? -1 : 0;
  const legTop = -legH;
  const torTop = legTop - torH + breathe;
  const headTop = torTop - headH + S(2);

  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  px(-torW, 0, torW * 2, S(2));

  // ── tail: segments curling out behind, ending in a barb ──
  ctx.fillStyle = cara;
  let txp = -dir * S(3);
  let typ = torTop + torH - S(2);
  for (let i = 0; i < S(6); i++) {
    px(txp, typ, S(2), S(2));
    txp -= dir * S(1.4);
    typ += Math.sin(i * 0.7 + now / 320) > 0 ? -1 : 1; // subtle sway
    if (i > S(3)) typ -= 1; // curl upward at the end
  }
  ctx.fillStyle = red;
  px(txp - (dir > 0 ? 0 : 1), typ - 1, 2, 2); // barb tip

  // ── legs (digitigrade, alternating step) ──
  const liftL = moving ? (phase ? -S(2) : 0) : 0;
  const liftR = moving ? (phase ? 0 : -S(2)) : 0;
  ctx.fillStyle = caraM;
  px(-S(3), legTop + liftL, S(2), legH - liftL);
  px(S(1), legTop + liftR, S(2), legH - liftR);
  ctx.fillStyle = cara; // clawed feet
  px(-S(4), legTop + liftL + legH - 1, S(3), 1);
  px(S(1), legTop + liftR + legH - 1, S(3), 1);

  // ── hunched torso: dark carapace with bone ribs + tint spine ──
  ctx.fillStyle = caraM;
  px(-torW / 2, torTop, torW, torH);
  ctx.fillStyle = cara;
  px(-torW / 2, torTop, torW, 1);
  ctx.fillStyle = bone; // rib plates
  px(-torW / 2 + 1, torTop + S(2), torW - 2, 1);
  px(-torW / 2 + 1, torTop + S(4), torW - 3, 1);
  ctx.fillStyle = glow; // glowing spine core
  px(-1, torTop + 1, S(2), torH - 2);

  // ── long front arm reaching forward with a claw ──
  ctx.fillStyle = caraM;
  const armY = torTop + S(2);
  px(dir > 0 ? torW / 2 - 1 : -torW / 2 - S(2) + 1, armY, S(3), 1);
  px(dir > 0 ? torW / 2 + S(1) : -torW / 2 - S(2), armY, 1, S(3));
  ctx.fillStyle = bone;
  px(dir > 0 ? torW / 2 + S(1) : -torW / 2 - S(2), armY + S(3), 1, 1); // claw

  // ── shoulder spikes (pauldrons) ──
  ctx.fillStyle = bone;
  px(-torW / 2 - 1, torTop, 2, S(2));
  px(torW / 2 - 1, torTop, 2, S(2));
  ctx.fillStyle = boneSh;
  px(-torW / 2 - 1, torTop - 1, 1, 1);
  px(torW / 2, torTop - 1, 1, 1);

  // ── elongated back-swept skull ──
  ctx.fillStyle = b ? bone : caraM; // boss has a pale skull face
  const hw = S(6);
  // stacked rows sweeping backward (opposite facing) toward the crest
  for (let i = 0; i < headH; i++) {
    const rw = Math.max(2, hw - i);
    const shift = Math.round((-dir * i) / 1.6) + (dir > 0 ? -1 : 1 - rw + hw);
    px(-hw / 2 + shift + (dir > 0 ? i / 2 : -i / 2), headTop + i, rw, 1);
  }
  // brow ridge + glowing eye slit on the facing side
  ctx.fillStyle = b ? red : cara;
  px(dir > 0 ? 0 : -hw / 2, headTop + S(2), hw / 2, 1);
  ctx.fillStyle = glow;
  px(dir > 0 ? S(1) : -S(2), headTop + S(3), S(2), 1); // eye
  // inner jaw glow
  ctx.fillStyle = hexA(glow, 0.6);
  px(dir > 0 ? 0 : -S(1), headTop + headH - 1, S(2), 1);

  // boss crest of spikes
  if (b) {
    ctx.fillStyle = red;
    px(-1, headTop - S(2), 2, S(2));
    px(-S(3), headTop - S(1), 1, S(1));
    px(S(2), headTop - S(1), 1, S(1));
  }
}

function drawMinimap(ctx: CanvasRenderingContext2D, active: Record<string, number>, now: number) {
  const mw = 150,
    mh = 96,
    mx = W - mw - 12,
    my = H - mh - 12;
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
export default function Station() {
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
  const [live, setLive] = useState(false); // true = events streamed from the WS backend

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

  /* ── event pipeline: applies a flow event, fed by the WS backend OR the
     built-in simulation (automatic fallback when no server is running) ── */
  useEffect(() => {
    let evId = 0;
    let missionCursor = 2;
    let simTimer = 0;
    let retryTimer = 0;
    let ws: WebSocket | null = null;
    let disposed = false;

    // apply one workflow event to beads + all the React panels
    const applyEvent = (ev: FlowEv) => {
      if (pausedRef.current || !ev || !ROOM[ev.from] || !ROOM[ev.to]) return;
      beadsRef.current.push({
        pts: edgePath(ev.from, ev.to),
        t: 0,
        speed: 0.0011 + Math.random() * 0.0009,
        color: ev.color,
        to: ev.to,
      });
      activeRef.current[ev.from] = Math.min(1.4, (activeRef.current[ev.from] ?? 0) + 0.6);
      evId += 1;
      const id = evId;
      setLog((l) => [{ id, text: ev.text, color: ev.color, type: ev.type }, ...l].slice(0, 40));
      if (Math.random() < 0.6) {
        const room = Math.random() < 0.5 ? ev.to : ev.from;
        const bub: Bubble = { id, room, text: pickDialog(ev.type) };
        setBubbles((bs) => [...bs.filter((b) => b.room !== room), bub].slice(-4));
        window.setTimeout(() => setBubbles((bs) => bs.filter((b) => b.id !== id)), 3400);
      }
      if (ev.type === "CONFLICT") setMorale((m) => Math.max(20, m - 3));
      else if (ev.type === "REPORT") setMorale((m) => Math.min(99, m + 2));
      const dtok = 40 + ((Math.random() * 260) | 0);
      setStats((s) => ({
        ...s,
        tokens: s.tokens + dtok,
        cost: s.cost + dtok * 0.000003,
        jobs: s.jobs + (ev.type === "REPORT" ? 1 : 0),
      }));
      setPool((p) => {
        const i = (Math.random() * p.length) | 0;
        return p.map((a, j) =>
          j === i
            ? { ...a, status: POOL_STATUS[(Math.random() * POOL_STATUS.length) | 0], active: true }
            : Math.random() < 0.06
              ? { ...a, active: false }
              : a,
        );
      });
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
    };

    // built-in simulation loop (used until/unless the WS backend connects)
    const stopSim = () => {
      if (simTimer) window.clearTimeout(simTimer);
      simTimer = 0;
    };
    const startSim = () => {
      stopSim();
      const tick = () => {
        if (!pausedRef.current) applyEvent(nextEvent());
        simTimer = window.setTimeout(tick, 700 + Math.random() * 900);
      };
      simTimer = window.setTimeout(tick, 400);
    };

    // try the FastAPI WebSocket backend; fall back to the local sim on failure
    const connect = () => {
      const host = window.location.hostname || "127.0.0.1";
      let sock: WebSocket;
      try {
        sock = new WebSocket(`ws://${host}:8000/ws`);
      } catch {
        return;
      }
      ws = sock;
      sock.onopen = () => {
        setLive(true);
        stopSim(); // server now drives events
      };
      sock.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data) as FlowEv;
          applyEvent(ev);
        } catch {
          /* ignore malformed frame */
        }
      };
      sock.onerror = () => {
        try {
          sock.close();
        } catch {
          /* noop */
        }
      };
      sock.onclose = () => {
        if (ws === sock) ws = null;
        setLive(false);
        if (!disposed) {
          startSim(); // resume local simulation
          retryTimer = window.setTimeout(connect, 4000); // keep trying the backend
        }
      };
    };

    startSim(); // works immediately, no server required
    connect(); // upgrade to live server stream if available

    return () => {
      disposed = true;
      stopSim();
      if (retryTimer) window.clearTimeout(retryTimer);
      if (ws) {
        ws.onclose = null;
        try {
          ws.close();
        } catch {
          /* noop */
        }
      }
    };
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
          <span style={{ ...sx.liveDot, background: paused ? C.ash : live ? C.sith : C.amber }} />
          <span style={{ color: paused ? C.ash : live ? C.sith : C.amber, ...sx.liveTxt }}>
            {paused ? "PAUSED" : live ? "● LIVE" : "◦ SIM"}
          </span>
          <button type="button" onClick={togglePause} style={sx.exit}>
            {paused ? "▶ RESUME" : "✕ EXIT"}
          </button>
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
        <span style={sx.buildTag}>
          {live
            ? "PHASE 2 · WEBSOCKET · LIVE FROM SERVER"
            : "PHASE 1 · SIMULATED STREAM · NO LLM · $0.00"}
        </span>
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
const sx: Record<string, CSSProperties> = {
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
  stageInner: { position: "relative", width: "100%", maxWidth: 1180, aspectRatio: `${W} / ${H}` },
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
