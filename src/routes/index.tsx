import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/mock/store";
import { Sparkline } from "@/components/Sparkline";
import {
  Area, AreaChart, ResponsiveContainer, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Newspaper, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Front — Dev · Dash" },
      { name: "description", content: "The front page: system pulse, the roster, the wire of open incidents, and the market desk." },
      { property: "og:title", content: "Dev · Dash — The Operations Edition" },
    ],
  }),
  component: Front,
});

const WORKLOAD_COLORS = [
  "var(--accent)",
  "var(--status-info)",
  "var(--status-success)",
  "var(--status-warning)",
  "var(--text-secondary)",
  "var(--status-danger)",
  "var(--text-muted)",
];

function Front() {
  const data = useStore((s) => s.data);

  // Per-workload throughput over the last 60 minutes — derived deterministically
  // from each workload's own sparkline + heartbeatPct so the chart actually means something.
  const series = useMemo(() => {
    const len = 60;
    return Array.from({ length: len }, (_, i) => {
      const minute = i - (len - 1); // -59 .. 0
      const point: Record<string, number | string> = { m: minute };
      let total = 0;
      for (const w of data.workloads) {
        const sp = w.sparkline.length ? w.sparkline : [0];
        const idx = (i / len) * sp.length;
        const a = sp[Math.floor(idx) % sp.length] ?? 0;
        const b = sp[(Math.floor(idx) + 1) % sp.length] ?? 0;
        const t = idx - Math.floor(idx);
        const interp = a * (1 - t) + b * t;
        const factor = w.status === "offline" ? 0
                     : w.status === "paused" ? 0.05
                     : w.status === "degraded" ? 0.55
                     : 1;
        const v = Math.round(interp * (w.heartbeatPct / 100) * factor * 0.9);
        point[w.slug] = v;
        total += v;
      }
      point._total = total;
      return point;
    });
  }, [data.workloads]);

  const totals = series.map((p) => p._total as number);
  const peak = totals.reduce((m, v) => Math.max(m, v), 0);
  const current = totals[totals.length - 1] ?? 0;
  const avg = totals.length ? Math.round(totals.reduce((s, v) => s + v, 0) / totals.length) : 0;
  const prevHourAvg = avg; // baseline
  const deltaPct = avg ? Math.round(((current - prevHourAvg) / prevHourAvg) * 100) : 0;
  const sample = totals.reduce((s, v) => s + v, 0);

  const totalAgents = data.workloads.reduce((s, w) => s + w.agents.length, 0);
  const firingAgents = data.workloads.flatMap((w) => w.agents).filter((a) => a.status !== "offline").length;
  const pausedCount = data.workloads.filter((w) => w.status === "paused").length;
  const degradedCount = data.workloads.filter((w) => w.status === "degraded").length;

  const headlineState =
    degradedCount > 0 ? "wobbling"
    : pausedCount > 0 ? "softening"
    : "holding";

  // Top contributor right now
  const contributors = data.workloads
    .map((w) => ({ slug: w.slug, v: (series[series.length - 1]?.[w.slug] as number) ?? 0 }))
    .sort((a, b) => b.v - a.v);
  const topNow = contributors[0];
  const topShare = current > 0 && topNow ? Math.round((topNow.v / current) * 100) : 0;

  return (
    <div className="pt-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-8">
        {/* Left column: hero pulse */}
        <section className="lg:col-span-8">
          <Eyebrow>System Pulse — Past 60 minutes · per workload</Eyebrow>
          <h1 className="font-serif text-[44px] leading-[1.05] tracking-tight text-text-primary md:text-[56px]">
            The line is{" "}
            <span className="italic text-accent">{headlineState}</span>
            {" "}—{" "}
            <span className="tabular-nums">{current}</span> events/s,{" "}
            <span className="tabular-nums">{data.workloads.length}</span>{" "}
            {data.workloads.length === 1 ? "workload" : "workloads"} on air.
          </h1>
          <p className="mt-4 max-w-[62ch] font-serif text-[17px] leading-relaxed text-text-secondary">
            Aggregierter Throughput aller Workloads im 60-Minuten-Fenster.{" "}
            {topNow && topShare > 0 ? (
              <>
                Größter Beitrag aktuell:{" "}
                <em className="text-text-primary">{topNow.slug}</em>{" "}
                mit <span className="font-mono text-[14px] text-text-primary">{topShare}%</span>.{" "}
              </>
            ) : null}
            {degradedCount > 0 && (
              <>
                <span className="text-status-warning">{degradedCount} workload{degradedCount > 1 ? "s" : ""} degraded</span>
                {" — "}Throughput dort spürbar reduziert.{" "}
              </>
            )}
            {pausedCount > 0 && (
              <>
                <span className="text-status-info">{pausedCount} pausiert</span>
                {" — "}beitragen aktuell ~0 ev/s.{" "}
              </>
            )}
            {degradedCount === 0 && pausedCount === 0 && (
              <>Keine Anomalien im Fenster, alle Worker im grünen Bereich.</>
            )}
          </p>

          {/* Pulse chart — stacked area per workload */}
          <div className="mt-6 h-[300px] border-t border-b hairline py-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 12, right: 12, left: 0, bottom: 16 }}>
                <defs>
                  {data.workloads.map((w, i) => {
                    const c = WORKLOAD_COLORS[i % WORKLOAD_COLORS.length];
                    return (
                      <linearGradient key={w.slug} id={`g-${w.slug}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.05} />
                      </linearGradient>
                    );
                  })}
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
                    color: "var(--text-primary)",
                  }}
                  itemStyle={{ color: "var(--text-secondary)" }}
                  labelFormatter={(v) => (v === 0 ? "now" : `${v}m ago`)}
                  formatter={(v, name) => [`${v} ev/s`, name as string]}
                />
                <ReferenceLine y={avg} stroke="var(--border-emphasis)" strokeDasharray="2 4"
                  label={{ value: `avg ${avg}`, position: "right", fill: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}
                />
                {data.workloads.map((w, i) => {
                  const c = WORKLOAD_COLORS[i % WORKLOAD_COLORS.length];
                  return (
                    <Area
                      key={w.slug}
                      type="monotone"
                      dataKey={w.slug}
                      stackId="1"
                      stroke={c}
                      strokeWidth={1}
                      fill={`url(#g-${w.slug})`}
                      isAnimationActive={false}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
            {data.workloads.map((w, i) => (
              <span key={w.slug} className="flex items-center gap-1.5">
                <span className="h-2 w-2" style={{ background: WORKLOAD_COLORS[i % WORKLOAD_COLORS.length] }} />
                {w.slug}
              </span>
            ))}
            <span className="ml-auto">y · events/s · sample {sample}</span>
          </div>

          {/* Stat strip — real numbers only */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 border-t hairline">
            <Metric
              label="Current"
              value={`${current}`}
              unit="ev/s"
              trend={`${deltaPct >= 0 ? "▲" : "▼"} ${Math.abs(deltaPct)}% vs 60m avg`}
              positive={deltaPct >= 0}
            />
            <Metric
              label="Peak · 60m"
              value={`${peak}`}
              unit="ev/s"
              trend={topNow ? `top: ${topNow.slug}` : "—"}
            />
            <Metric
              label="Workloads"
              value={`${data.workloads.length - pausedCount - degradedCount}`}
              unit={`/ ${data.workloads.length} live`}
              trend={`${pausedCount} paused · ${degradedCount} degraded`}
              highlight={pausedCount + degradedCount > 0}
            />
            <Metric
              label="Agents firing"
              value={`${firingAgents}`}
              unit={`/ ${totalAgents}`}
              trend={`${totalAgents - firingAgents} idle`}
            />
          </div>
        </section>

        {/* Right column: roster + wire */}
        <aside className="lg:col-span-4 space-y-10">
          <RosterPanel />
          <WirePanel />
        </aside>
      </div>

      {/* Market desk */}
      <MarketDesk />

      {/* Agents on duty */}
      <section className="mt-14">
        <div className="flex items-end justify-between border-b hairline pb-2">
          <h2 className="font-serif text-2xl text-text-primary">
            <span className="italic text-text-secondary">Agents</span> on duty
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            {totalAgents} components
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

function Metric({
  label, value, unit, trend, highlight, positive,
}: { label: string; value: string; unit?: string; trend?: string; highlight?: boolean; positive?: boolean }) {
  const trendColor =
    positive === true ? "text-status-success"
    : positive === false ? "text-status-danger"
    : "text-text-muted";
  return (
    <div className="border-r last:border-r-0 hairline px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`font-serif text-3xl tabular-nums ${highlight ? "text-status-warning" : "text-text-primary"}`}>{value}</span>
        {unit && <span className="font-mono text-[11px] text-text-muted">{unit}</span>}
      </div>
      {trend && <div className={`mt-1 font-mono text-[10px] ${trendColor}`}>{trend}</div>}
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
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">sorted by health</span>
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
                    <Sparkline data={w.sparkline} height={24} area={false}
                      color={isZero ? "var(--text-muted)" : "var(--text-secondary)"} />
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

function WirePanel() {
  const data = useStore((s) => s.data);
  const ack = useStore((s) => s.ackAlert);
  const open = data.alerts.filter((a) => !a.acked);
  const shown = open.slice(0, 4);
  return (
    <div>
      <div className="flex items-end justify-between border-t-2 border-status-danger/70 pt-2">
        <h2 className="font-serif text-2xl text-text-primary">
          The <span className="italic">wire</span> — open incidents
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-status-danger">
          {open.length} unresolved
        </span>
      </div>
      {shown.length === 0 ? (
        <p className="mt-6 font-serif italic text-text-muted">All quiet. No open incidents on the wire.</p>
      ) : (
        <ul className="divide-y hairline">
          {shown.map((a, i) => (
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

function MarketDesk() {
  const data = useStore((s) => s.data);
  const m = data.market;
  if (!m) return null;

  // Client-only timestamp to avoid hydration mismatch
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const positive = m.portfolioDayChangePct >= 0;
  return (
    <section className="mt-14">
      <div className="flex items-end justify-between border-b hairline pb-2">
        <h2 className="font-serif text-2xl text-text-primary">
          The <span className="italic">market</span> desk
          <span className="ml-3 font-serif text-base italic text-text-muted">by market-analyst</span>
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          {m.asOf}{now ? ` · ${now}` : ""}
        </span>
      </div>

      {/* Indices ribbon */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 border hairline">
        {m.indices.map((idx) => {
          const up = idx.changePct >= 0;
          return (
            <div key={idx.name} className="border-r last:border-r-0 hairline px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">{idx.name}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-xl tabular-nums text-text-primary">
                  {idx.value.toLocaleString("en-US", { maximumFractionDigits: idx.value > 1000 ? 0 : 2 })}
                </span>
                <span className={`flex items-center gap-0.5 font-mono text-[11px] tabular-nums ${up ? "text-status-success" : "text-status-danger"}`}>
                  {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {up ? "+" : ""}{idx.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-8">
        {/* Positions */}
        <div className="lg:col-span-7">
          <div className="flex items-end justify-between pb-2">
            <h3 className="font-serif text-xl text-text-primary">
              <span className="italic text-text-secondary">Your</span> positions
            </h3>
            <div className="text-right">
              <div className="font-serif text-2xl tabular-nums text-text-primary">
                €{m.portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`font-mono text-[11px] tabular-nums ${positive ? "text-status-success" : "text-status-danger"}`}>
                {positive ? "▲" : "▼"} {Math.abs(m.portfolioDayChangePct).toFixed(2)}% today
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y hairline text-left font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
                  <th className="py-2 pr-3 font-normal">Symbol</th>
                  <th className="py-2 pr-3 font-normal">Kind</th>
                  <th className="py-2 pr-3 text-right font-normal">Shares</th>
                  <th className="py-2 pr-3 text-right font-normal">Price</th>
                  <th className="py-2 pr-3 text-right font-normal">Day</th>
                  <th className="py-2 pr-3 text-right font-normal">Total P/L</th>
                </tr>
              </thead>
              <tbody>
                {m.positions.map((p) => {
                  const dayUp = p.dayChangePct >= 0;
                  const totalUp = p.totalChangePct >= 0;
                  return (
                    <tr key={p.symbol} className="border-b hairline">
                      <td className="py-3 pr-3">
                        <div className="font-mono text-[13px] text-text-primary">{p.symbol}</div>
                        <div className="text-[11px] text-text-muted truncate max-w-[180px]">{p.name}</div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">{p.kind}</td>
                      <td className="py-3 pr-3 text-right font-mono text-[12px] text-text-secondary tabular-nums">
                        {p.shares}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono text-[12px] text-text-primary tabular-nums">
                        {p.price >= 1000 ? p.price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p.price.toFixed(2)}
                      </td>
                      <td className={`py-3 pr-3 text-right font-mono text-[12px] tabular-nums ${dayUp ? "text-status-success" : "text-status-danger"}`}>
                        {dayUp ? "+" : ""}{p.dayChangePct.toFixed(2)}%
                      </td>
                      <td className={`py-3 pr-3 text-right font-mono text-[12px] tabular-nums ${totalUp ? "text-status-success" : "text-status-danger"}`}>
                        {totalUp ? "+" : ""}{p.totalChangePct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tips */}
        <div className="lg:col-span-5">
          <h3 className="pb-2 font-serif text-xl text-text-primary">
            <Target className="inline h-4 w-4 mb-1 mr-1.5 text-accent" />
            <span className="italic text-text-secondary">Today&apos;s</span> calls
          </h3>
          <ul className="divide-y hairline border-y hairline">
            {m.tips.map((t) => (
              <li key={t.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${tipColor(t.action)}`}>
                      {t.action}
                    </span>
                    <span className="ml-2 font-mono text-[13px] text-text-primary">{t.symbol}</span>
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
                      · {t.horizon}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-text-muted tabular-nums">
                    conf {(t.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-1 font-serif text-[14px] leading-snug text-text-secondary">{t.rationale}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">
            Synthetic signals · not financial advice
          </p>
        </div>
      </div>

      {/* News wire */}
      <div className="mt-10">
        <div className="flex items-end justify-between border-b hairline pb-2">
          <h3 className="font-serif text-xl text-text-primary">
            <Newspaper className="inline h-4 w-4 mb-1 mr-1.5 text-accent" />
            <span className="italic text-text-secondary">News</span> on your tape
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 mt-2">
          {m.news.map((n) => (
            <article key={n.id} className="border-b hairline py-3">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
                <span className="text-text-secondary">{n.source}</span>
                <span>·</span>
                <span>{n.agoMin < 60 ? `${n.agoMin}m` : `${Math.floor(n.agoMin / 60)}h`} ago</span>
                <span>·</span>
                <span className={sentimentColor(n.sentiment)}>{n.sentiment}</span>
              </div>
              <h4 className="mt-1 font-serif text-[16px] leading-snug text-text-primary">
                {n.headline}
              </h4>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {n.symbols.map((s) => (
                  <span key={s} className="rounded-sm border hairline px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
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
  ).slice(0, 10);

  if (rows.length === 0) {
    return <p className="mt-6 font-serif italic text-text-muted">No agents on duty.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b hairline text-left font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            <th className="py-2 pr-4 font-normal">Agent</th>
            <th className="py-2 pr-4 font-normal">Workload</th>
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
              <td className="py-3 pr-4 font-mono text-[12px] text-text-muted">{a.slug}</td>
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
    critical: "text-status-danger",
    warning: "text-status-warning",
    info: "text-status-info",
  } as const;
  return <span className={map[s]}>{s}</span>;
}

function tipColor(a: "buy" | "sell" | "hold" | "watch") {
  if (a === "buy") return "text-status-success";
  if (a === "sell") return "text-status-danger";
  if (a === "watch") return "text-status-warning";
  return "text-text-secondary";
}

function sentimentColor(s: "bullish" | "bearish" | "neutral") {
  if (s === "bullish") return "text-status-success";
  if (s === "bearish") return "text-status-danger";
  return "text-text-muted";
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
