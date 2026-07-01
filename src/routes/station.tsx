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

/* ───────────────────────────── palette (per spec — SITH-RED) ────────────── */
const C = {
  void: "#04050a",
  hull: "#0b0d15",
  sith: "#ff1f3d",
  ember: "#ff6a4d",
  amber: "#ffaa33",
  ash: "#565c70",
  bone: "#c6cad8",
  steel: "#5b8dd6",
  toxic: "#57e08a",
  deep: "#b11026",
} as const;

/* ───────────────────────────── logical canvas ──────────────────────────── */
const W = 512;
const H = 320;

type Theme = keyof typeof ROOM_THEME;
const ROOM_THEME = {
  sith: { edge: C.sith, floor: "#170a10", glow: C.sith },
  ember: { edge: C.ember, floor: "#1a0f0a", glow: C.ember },
  amber: { edge: C.amber, floor: "#1a140a", glow: C.amber },
  steel: { edge: C.steel, floor: "#0a1220", glow: C.steel },
  toxic: { edge: C.toxic, floor: "#0a1a12", glow: C.toxic },
  deep: { edge: C.deep, floor: "#1a0a0d", glow: C.deep },
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
    x: 206,
    y: 122,
    w: 100,
    h: 82,
    theme: "sith",
    boss: true,
    crew: 1,
  },
  { id: "resA", label: "RECHERCHE α", x: 26, y: 26, w: 92, h: 62, theme: "steel", crew: 2 },
  { id: "resB", label: "RECHERCHE β", x: 26, y: 130, w: 92, h: 62, theme: "steel", crew: 2 },
  { id: "resG", label: "RECHERCHE γ", x: 26, y: 232, w: 92, h: 62, theme: "steel", crew: 2 },
  { id: "fact", label: "FAKTENCHECK", x: 148, y: 20, w: 88, h: 58, theme: "amber", crew: 1 },
  { id: "confl", label: "WIDERSPRUCH", x: 288, y: 20, w: 88, h: 58, theme: "deep", crew: 1 },
  { id: "synth", label: "SYNTHESE", x: 394, y: 60, w: 92, h: 62, theme: "sith", crew: 1 },
  { id: "crit", label: "KRITIKER", x: 394, y: 160, w: 92, h: 62, theme: "toxic", crew: 1 },
  { id: "cite", label: "ZITATION", x: 300, y: 236, w: 88, h: 58, theme: "amber", crew: 1 },
  { id: "rep", label: "REPORT", x: 178, y: 240, w: 96, h: 58, theme: "ember", crew: 2 },
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

function drawStatic(ctx: CanvasRenderingContext2D, stars: { x: number; y: number; b: number }[]) {
  // deep space
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, W, H);
  // faint nebula wash
  const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 260);
  g.addColorStop(0, "rgba(255,31,61,0.05)");
  g.addColorStop(1, "rgba(4,5,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // stars
  for (const s of stars) {
    ctx.fillStyle = `rgba(198,202,216,${s.b})`;
    ctx.fillRect(s.x, s.y, 1, 1);
  }
  // corridors (drawn once, under everything)
  for (const [a, b] of EDGES) {
    const pts = edgePath(a, b);
    ctx.strokeStyle = "rgba(86,92,112,0.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    ctx.strokeStyle = "rgba(11,13,21,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // rooms
  for (const r of ROOMS) drawRoom(ctx, r);
}

function drawRoom(ctx: CanvasRenderingContext2D, r: Room) {
  const th = ROOM_THEME[r.theme];
  // floor
  ctx.fillStyle = th.floor;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // floor grid
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let gx = r.x + 8; gx < r.x + r.w; gx += 8) {
    ctx.beginPath();
    ctx.moveTo(gx + 0.5, r.y + 1);
    ctx.lineTo(gx + 0.5, r.y + r.h - 1);
    ctx.stroke();
  }
  for (let gy = r.y + 8; gy < r.y + r.h; gy += 8) {
    ctx.beginPath();
    ctx.moveTo(r.x + 1, gy + 0.5);
    ctx.lineTo(r.x + r.w - 1, gy + 0.5);
    ctx.stroke();
  }
  // machines / consoles along the top wall
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  for (let mx = r.x + 6; mx < r.x + r.w - 10; mx += 14) {
    ctx.fillRect(mx, r.y + 4, 9, 6);
  }
  // wall / neon border
  ctx.strokeStyle = th.edge;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  // corner nubs
  ctx.fillStyle = th.edge;
  ctx.fillRect(r.x, r.y, 3, 3);
  ctx.fillRect(r.x + r.w - 3, r.y, 3, 3);
  ctx.fillRect(r.x, r.y + r.h - 3, 3, 3);
  ctx.fillRect(r.x + r.w - 3, r.y + r.h - 3, 3, 3);
}

function drawDynamic(
  ctx: CanvasRenderingContext2D,
  beads: Bead[],
  active: Record<string, number>,
  now: number,
) {
  ctx.globalCompositeOperation = "lighter";

  // active-room border pulse + machine LEDs
  for (const r of ROOMS) {
    const th = ROOM_THEME[r.theme];
    const heat = active[r.id] ?? 0; // 0..1 recent activity
    const pulse = 0.35 + 0.25 * Math.sin(now / 320 + r.x);
    const glow = Math.min(1, pulse + heat);
    ctx.strokeStyle = hexA(th.glow, 0.16 + 0.5 * glow);
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1);
    if (heat > 0.05) {
      ctx.strokeStyle = hexA(th.glow, 0.25 * heat);
      ctx.strokeRect(r.x - 2.5, r.y - 2.5, r.w + 5, r.h + 5);
    }
    // blinking machine LEDs
    for (let i = 0, mx = r.x + 9; mx < r.x + r.w - 10; mx += 14, i++) {
      const on = (now / 240 + i * 1.7 + r.y) % 3 < 1.4;
      if (on) {
        ctx.fillStyle = hexA(C.amber, 0.9);
        ctx.fillRect(mx, r.y + 5, 2, 2);
      }
    }
    // crew figures
    for (let i = 0; i < r.crew; i++) {
      const bob = Math.sin(now / 500 + i * 2 + r.x) > 0 ? 1 : 0;
      const px = r.x + 12 + i * 12;
      const py = r.y + r.h - 16 + bob;
      drawFigure(ctx, px, py, th.glow, false);
    }
    // boss figure
    if (r.boss) {
      const aura = 0.4 + 0.3 * Math.sin(now / 260);
      ctx.fillStyle = hexA(C.sith, 0.1 + 0.14 * aura);
      ctx.fillRect(cx(r) - 14, cy(r) - 16, 28, 30);
      drawFigure(ctx, cx(r) - 4, cy(r) - 10, C.sith, true);
    }
  }

  // travelling beads (message hand-offs)
  for (const b of beads) {
    const [x, y] = walk(b.pts, Math.min(1, b.t));
    ctx.fillStyle = hexA(b.color, 0.18);
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = hexA(b.color, 0.55);
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    // fading trail
    for (let k = 1; k <= 3; k++) {
      const [tx, ty] = walk(b.pts, Math.max(0, b.t - k * 0.02));
      ctx.fillStyle = hexA(b.color, 0.18 / k);
      ctx.fillRect(tx - 1, ty - 1, 2, 2);
    }
  }

  ctx.globalCompositeOperation = "source-over";
  drawMinimap(ctx, active, now);
}

function drawFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  boss: boolean,
) {
  const s = boss ? 2 : 1;
  // body
  ctx.fillStyle = hexA(color, boss ? 0.95 : 0.75);
  ctx.fillRect(x, y, 3 * s, 5 * s);
  // head
  ctx.fillRect(x + (boss ? 0 : 0.5) * s, y - 3 * s, 3 * s, 3 * s);
  // eye
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + s, y - 2 * s, s, s);
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
    ctx.fillStyle = hexA(th.edge, 0.4 + 0.6 * heat);
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

/* ───────────────────────────── component ───────────────────────────────── */
function Station() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beadsRef = useRef<Bead[]>([]);
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

    const stars = Array.from({ length: 90 }, () => ({
      x: (Math.random() * W) | 0,
      y: (Math.random() * H) | 0,
      b: 0.15 + Math.random() * 0.5,
    }));

    // static layer cached to an offscreen canvas
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    drawStatic(off.getContext("2d")!, stars);

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
        // decay activity heat
        for (const k in activeRef.current) {
          activeRef.current[k] = Math.max(0, activeRef.current[k] - dt * 0.0009);
        }
      }
      ctx.drawImage(off, 0, 0);
      drawDynamic(ctx, beadsRef.current, activeRef.current, now);
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
        });
        activeRef.current[ev.from] = Math.min(1.4, (activeRef.current[ev.from] ?? 0) + 0.6);
        // log
        evId += 1;
        const id = evId;
        setLog((l) => [{ id, text: ev.text, color: ev.color, type: ev.type }, ...l].slice(0, 40));
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

      {/* ── top status bar ── */}
      <header style={sx.topbar}>
        <div style={sx.logoWrap}>
          <span style={sx.logoMark}>◈</span>
          <span style={sx.logo}>ULTRON-08</span>
          <span style={sx.logoSub}>DARK STATION</span>
        </div>
        <div style={sx.metrics}>
          <Metric label="UPTIME" value={upt} />
          <Metric label="TOKENS" value={stats.tokens.toLocaleString("en-US")} accent={C.ember} />
          <Metric label="COST" value={"$" + stats.cost.toFixed(4)} accent={C.amber} />
          <Metric label="JOBS" value={String(stats.jobs)} />
          <Metric label="AGENTS" value={`${stats.active}/${pool.length}`} accent={C.sith} />
          <Metric label="FEEDS" value={String(beadsRef.current.length).padStart(2, "0")} />
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
                  color: ROOM_THEME[r.theme].edge,
                  fontWeight: r.boss ? 700 : 500,
                }}
              >
                {r.label}
              </span>
            ))}
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
function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={sx.metric}>
      <span style={sx.metricLabel}>{label}</span>
      <span style={{ ...sx.metricValue, color: accent ?? C.bone }}>{value}</span>
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
  logoSub: { color: C.ash, fontSize: 9, letterSpacing: 3 },
  metrics: { display: "flex", gap: 18, marginLeft: 8, flexWrap: "wrap" },
  metric: { display: "flex", flexDirection: "column", lineHeight: 1.1 },
  metricLabel: { fontSize: 8, letterSpacing: 1.5, color: C.ash },
  metricValue: { fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
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
.dark-station-scroll::-webkit-scrollbar{width:6px;height:6px}
`;
