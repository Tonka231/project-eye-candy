import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/mock/store";
import { Sparkline } from "@/components/Sparkline";
import {
  Area, AreaChart, ResponsiveContainer, ReferenceLine, ReferenceDot,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Front — Dev · Dash" },
      { name: "description", content: "The front page: system pulse, the roster, the wire of open incidents, and agents on duty." },
      { property: "og:title", content: "Dev · Dash — The Operations Edition" },
    ],
  }),
  component: Front,
});

function fmtAgo(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function Front() {
  const data = useStore((s) => s.data);

  // Compose pulse series — 60 mins, derived from heartbeatsSpark stretched
  const base = data.stats.heartbeatsSpark.length ? data.stats.heartbeatsSpark : [0];
  const seriesLen = 60;
  const series = Array.from({ length: seriesLen }, (_, i) => {
    const idx = (i / seriesLen) * base.length;
    const a = base[Math.floor(idx) % base.length] ?? 0;
    const b = base[(Math.floor(idx) + 1) % base.length] ?? 0;
    const t = idx - Math.floor(idx);
    const v = a * (1 - t) + b * t;
    // dip near minute 47 for the "degraded" beat
    const dip = i === 47 ? v * 0.55 : i >= 45 && i <= 49 ? v * (0.7 + Math.random() * 0.1) : v;
    return { m: i - seriesLen, v: Math.round(dip) };
  });
  const peak = series.reduce((m, p) => Math.max(m, p.v), 0);
  const current = series[series.length - 1]?.v ?? 0;
  const avg = Math.round(series.reduce((s, p) => s + p.v, 0) / series.length);
  const dipPoint = series.reduce((min, p) => (p.v < min.v ? p : min), series[0]);

  const eventsPerSec = (current / 10).toFixed(1);
  const totalEvents = series.reduce((s, p) => s + p.v, 0);
  const totalAgents = data.workloads.reduce((s, w) => s + w.agents.length, 0);
  const firingAgents = data.workloads.flatMap((w) => w.agents).filter((a) => a.status !== "offline").length;
  const pausedCount = data.workloads.filter((w) => w.status === "paused").length;
  const degradedCount = data.workloads.filter((w) => w.status === "degraded").length;

  const openIncidents = data.alerts.filter((a) => !a.acked);

  return (
    <div className="pt-8">
      {/* Pulse section header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-8">
        {/* Left column: hero pulse */}
        <section className="lg:col-span-8">
          <Eyebrow>System Pulse — Past 60 minutes</Eyebrow>
          <h1 className="font-serif text-[44px] leading-[1.05] tracking-tight text-text-primary md:text-[56px]">
            The line is{" "}
            <span className="italic text-accent">
              {pausedCount + degradedCount > 0 ? "wobbling" : "holding"}
            </span>{" "}
            — <span className="tabular-nums">{eventsPerSec}</span> events/s,{" "}
            <span className="tabular-nums">{data.workloads.length}</span>{" "}
            {data.workloads.length === 1 ? "workload" : "workloads"}.
          </h1>
          <p className="mt-4 max-w-[60ch] font-serif text-[17px] leading-relaxed text-text-secondary">
            Aggregierter Throughput aller laufenden Workloads. Eine kurze Delle um{" "}
            <span className="font-mono text-[14px] text-text-primary">
              {Math.abs(dipPoint.m)}m
            </span>{" "}
            ago, als <em className="text-text-primary">claude-trader</em> kurz in{" "}
            <span className="text-status-warning">degraded</span> kippte — risk-checker hat den Trade-Loop pausiert
            und nach <span className="font-mono text-text-primary">4 min</span> wieder freigegeben.
            Sonst stabil, <span className="text-status-success">+6%</span> gegenüber dem Stundenschnitt.
          </p>

          {/* Pulse chart */}
          <div className="mt-6 h-[280px] border-t border-b hairline py-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 12, right: 12, left: 0, bottom: 16 }}>
                <defs>
                  <linearGradient id="pulse-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="m"
                  ticks={[-60, -45, -30, -15, 0]}
                  tickFormatter={(v) => (v === 0 ? "now" : `${v}m`)}
                  tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={36}
                  tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                  labelFormatter={(v) => (v === 0 ? "now" : `${v}m ago`)}
                  formatter={(v: number) => [`${v} ev/s`, "throughput"]}
                />
                <ReferenceLine y={avg} stroke="var(--border-emphasis)" strokeDasharray="2 4" label={{ value: `avg ${avg}`, position: "right", fill: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }} />
                <ReferenceDot x={dipPoint.m} y={dipPoint.v} r={3} fill="var(--status-danger)" stroke="none" />
                <Area type="monotone" dataKey="v" stroke="var(--text-primary)" strokeWidth={1.25} fill="url(#pulse-grad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
            <div className="flex items-center gap-4">
              <LegendDot color="var(--text-primary)" label="Throughput" />
              <LegendDot color="var(--accent)" label="Volume" outline />
              <LegendDot color="var(--border-emphasis)" label="Hourly avg" dashed />
            </div>
            <span>y · events/s · sample {totalEvents}</span>
          </div>

          {/* Stat strip */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 border-t hairline">
            <Metric label="Current" value={`${current}`} unit="ev/s" trend={`▲ 6% vs hourly avg`} />
            <Metric label={`Peak · 60m`} value={`${peak}`} unit="ev/s" trend={`at ${Math.abs(dipPoint.m + 10)}:${String(Math.floor(Math.random() * 59)).padStart(2, "0")} UTC`} />
            <Metric label="Workloads" value={`${data.workloads.length}`} unit={`/ ${data.workloads.length}`} trend={`${pausedCount} paused · ${degradedCount} degraded`} highlight={pausedCount + degradedCount > 0} />
            <Metric label="Agents firing" value={`${firingAgents}`} unit={`/ ${totalAgents}`} trend={`${totalAgents - firingAgents} idle`} />
          </div>
        </section>

        {/* Right column: roster + wire */}
        <aside className="lg:col-span-4 space-y-10">
          <RosterPanel />
          <WirePanel openCount={openIncidents.length} />
        </aside>
      </div>

      {/* Agents on duty */}
      <section className="mt-14">
        <div className="flex items-end justify-between border-b hairline pb-2">
          <h2 className="font-serif text-2xl text-text-primary">
            <span className="italic text-text-secondary">Agents</span> on duty
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            {totalAgents} components · postgres / anthropic api / exchange api
          </span>
        </div>
        <AgentsTable />
      </section>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </div>
  );
}

function LegendDot({ color, label, outline, dashed }: { color: string; label: string; outline?: boolean; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {dashed ? (
        <span className="h-px w-4 border-t" style={{ borderColor: color, borderStyle: "dashed", borderTopWidth: 1 }} />
      ) : (
        <span className={`h-2 w-2 ${outline ? "border" : ""}`} style={{ background: outline ? "transparent" : color, borderColor: color }} />
      )}
      {label}
    </span>
  );
}

function Metric({ label, value, unit, trend, highlight }: { label: string; value: string; unit?: string; trend?: string; highlight?: boolean }) {
  return (
    <div className="border-r last:border-r-0 hairline px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`font-serif text-3xl tabular-nums ${highlight ? "text-status-warning" : "text-text-primary"}`}>{value}</span>
        {unit && <span className="font-mono text-[11px] text-text-muted">{unit}</span>}
      </div>
      {trend && <div className="mt-1 font-mono text-[10px] text-text-muted">{trend}</div>}
    </div>
  );
}

function RosterPanel() {
  const data = useStore((s) => s.data);
  const sorted = [...data.workloads].sort((a, b) => b.heartbeatPct - a.heartbeatPct);
  return (
    <div>
      <div className="flex items-end justify-between border-b hairline pb-2">
        <h2 className="font-serif text-2xl text-text-primary">
          The <span className="italic">roster</span>
          <span className="ml-2 font-serif text-base italic text-text-muted">
            {sorted.length === 0 ? "no workloads" : `${num(sorted.length)} workloads`}
          </span>
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">sorted by throughput</span>
      </div>
      {sorted.length === 0 ? (
        <p className="mt-6 font-serif text-text-muted italic">The roster is empty. Switch to "normal" or "full" in Setup.</p>
      ) : (
        <ul className="divide-y hairline">
          {sorted.map((w, i) => {
            const evps = (w.heartbeatPct / 8).toFixed(1);
            const isZero = w.status === "offline" || w.status === "registered";
            return (
              <li key={w.slug}>
                <Link
                  to="/workloads/$slug"
                  params={{ slug: w.slug }}
                  className="grid grid-cols-[28px_1fr_70px_auto] items-center gap-3 py-3 hover:bg-bg-surface/40"
                >
                  <span className="font-mono text-[10px] tabular-nums text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Dot status={w.status} />
                      <span className="font-mono text-[13px] text-text-primary">{w.slug}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-text-muted">{w.name}</div>
                  </div>
                  <div className="h-6">
                    <Sparkline
                      data={w.sparkline}
                      height={24}
                      area={false}
                      color={isZero ? "var(--text-muted)" : "var(--text-secondary)"}
                    />
                  </div>
                  <div className="text-right">
                    <div className={`font-serif text-xl tabular-nums ${isZero ? "text-text-muted" : "text-text-primary"}`}>
                      {isZero ? "0" : evps}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">events / s</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function WirePanel({ openCount }: { openCount: number }) {
  const data = useStore((s) => s.data);
  const ack = useStore((s) => s.ackAlert);
  const open = data.alerts.filter((a) => !a.acked).slice(0, 4);
  return (
    <div>
      <div className="flex items-end justify-between border-t-2 border-status-danger/70 pt-2">
        <h2 className="font-serif text-2xl text-text-primary">
          The <span className="italic">wire</span> — open incidents
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-status-danger">
          {openCount} unresolved
        </span>
      </div>
      {open.length === 0 ? (
        <p className="mt-6 font-serif italic text-text-muted">All quiet. No open incidents on the wire.</p>
      ) : (
        <ul className="divide-y hairline">
          {open.map((a, i) => (
            <li key={a.id} className="py-3">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-sm italic text-text-muted tabular-nums">
                  {roman(i + 1)}.
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                    <SeverityTag s={a.severity} /> · {a.source}
                  </div>
                  <div className="mt-1 font-serif text-[15px] leading-snug text-text-primary">
                    {a.message}
                  </div>
                  <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-text-muted">
                    <span>×{a.occurrences}</span>
                    <span>·</span>
                    <span>last seen {fmtAgoLong(a.lastSeenSec)} ago</span>
                    <span>·</span>
                    <button
                      onClick={() => ack(a.id)}
                      className="uppercase tracking-[0.18em] text-accent hover:underline"
                    >
                      acknowledge →
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 text-right">
        <Link to="/alerts" className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted hover:text-text-secondary">
          full incident desk →
        </Link>
      </div>
    </div>
  );
}

function AgentsTable() {
  const data = useStore((s) => s.data);
  const rows = data.workloads.flatMap((w) =>
    w.agents.map((a) => ({
      ...a,
      slug: w.slug,
      events: estimateEvents(a, w.heartbeatPct),
      latency: estimateLatency(a),
    }))
  ).slice(0, 8);

  if (rows.length === 0) {
    return <p className="mt-6 font-serif italic text-text-muted">No agents on duty.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b hairline text-left font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            <th className="py-2 pr-4 font-normal">Agent</th>
            <th className="py-2 pr-4 font-normal">Role</th>
            <th className="py-2 pr-4 font-normal">Status</th>
            <th className="py-2 pr-4 text-right font-normal">Events</th>
            <th className="py-2 pr-4 text-right font-normal">Latency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b hairline">
              <td className="py-3 pr-4 font-mono text-[13px] text-text-primary">{a.name}</td>
              <td className="py-3 pr-4 font-mono text-[12px] text-text-muted">{a.role}</td>
              <td className="py-3 pr-4">
                <span className="inline-flex items-center gap-2 font-mono text-[12px] text-text-secondary">
                  <Dot status={a.status === "online" ? "running" : a.status === "degraded" ? "degraded" : "offline"} />
                  {a.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[13px] text-text-primary tabular-nums">
                {a.status === "offline" ? "—" : a.events}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[12px] text-text-muted tabular-nums">
                {a.status === "offline" ? "—" : `${a.latency} ms`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dot({ status }: { status: string }) {
  const c =
    status === "running" || status === "online"
      ? "bg-status-success"
      : status === "degraded"
      ? "bg-status-warning"
      : status === "paused"
      ? "bg-status-info"
      : "bg-text-muted";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${c}`} />;
}

function SeverityTag({ s }: { s: "critical" | "warning" | "info" }) {
  const map = {
    critical: { label: "critical", c: "text-status-danger" },
    warning: { label: "warning", c: "text-status-warning" },
    info: { label: "info", c: "text-status-info" },
  } as const;
  return <span className={map[s].c}>{map[s].label}</span>;
}

function roman(n: number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n - 1] ?? String(n);
}

function num(n: number) {
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
}

function fmtAgoLong(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function estimateEvents(a: { id: string; status: string }, hb: number) {
  const seed = a.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = (seed % 1200) + 80;
  const v = Math.round((base * hb) / 100);
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k/s`;
  return `${v}/s`;
}

function estimateLatency(a: { id: string; status: string }) {
  const seed = a.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = (seed % 130) + 8;
  return a.status === "degraded" ? base + 200 : base;
}
