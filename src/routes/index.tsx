import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/mock/store";
import { Sparkline } from "@/components/Sparkline";
import {
  Area, AreaChart, ResponsiveContainer, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { workloadColor } from "@/lib/workload-colors";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Front — Dev · Dash" },
      { name: "description", content: "The front page: system pulse, the roster, the wire of open incidents, and the activity feed." },
      { property: "og:title", content: "Dev · Dash — The Operations Edition" },
    ],
  }),
  component: Front,
});

function Front() {
  const data = useStore((s) => s.data);

  // Per-workload throughput, last 60 minutes — chart only the top 4 contributors
  // (by avg sparkline). Smaller workloads get folded into "other" so the stack
  // stays legible.
  const { series, charted, other, totals } = useMemo(() => {
    const len = 60;
    const ranked = [...data.workloads]
      .map((w) => ({
        slug: w.slug,
        avg: w.sparkline.reduce((s, v) => s + v, 0) / Math.max(1, w.sparkline.length),
        w,
      }))
      .sort((a, b) => b.avg - a.avg);
    const top = ranked.slice(0, 4).map((r) => r.w);
    const rest = ranked.slice(4).map((r) => r.w);

    const compute = (w: typeof data.workloads[number], i: number) => {
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
      return Math.round(interp * (w.heartbeatPct / 100) * factor * 0.9);
    };

    const series = Array.from({ length: len }, (_, i) => {
      const point: Record<string, number | string> = { m: i - (len - 1) };
      let total = 0;
      for (const w of top) {
        const v = compute(w, i);
        point[w.slug] = v;
        total += v;
      }
      let otherSum = 0;
      for (const w of rest) otherSum += compute(w, i);
      if (rest.length) point.__other = otherSum;
      total += otherSum;
      point._total = total;
      return point;
    });
    return {
      series,
      charted: top,
      other: rest,
      totals: series.map((p) => p._total as number),
    };
  }, [data.workloads]);

  const peak = totals.reduce((m, v) => Math.max(m, v), 0);
  const current = totals[totals.length - 1] ?? 0;
  const avg = totals.length ? Math.round(totals.reduce((s, v) => s + v, 0) / totals.length) : 0;
  const deltaPct = avg ? Math.round(((current - avg) / avg) * 100) : 0;

  const totalAgents = data.workloads.reduce((s, w) => s + w.agents.length, 0);
  const firingAgents = data.workloads.flatMap((w) => w.agents).filter((a) => a.status !== "offline").length;
  const pausedCount = data.workloads.filter((w) => w.status === "paused").length;
  const degradedCount = data.workloads.filter((w) => w.status === "degraded").length;

  const headlineState =
    degradedCount > 0 ? "wobbling"
    : pausedCount > 0 ? "softening"
    : "holding";

  const contributors = data.workloads
    .map((w) => ({ slug: w.slug, v: (series[series.length - 1]?.[w.slug] as number) ?? 0 }))
    .sort((a, b) => b.v - a.v);
  const topNow = contributors[0];
  const topShare = current > 0 && topNow ? Math.round((topNow.v / current) * 100) : 0;

  return (
    <div className="pt-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
        {/* Left: hero pulse */}
        <section className="lg:col-span-8">
          <Eyebrow>System Pulse — Past 60 minutes</Eyebrow>
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
            {topNow && topShare > 0 && (
              <>Größter Beitrag aktuell: <em className="text-text-primary">{topNow.slug}</em>{" "}
              mit <span className="font-mono text-[14px] text-text-primary">{topShare}%</span>. </>
            )}
            {degradedCount > 0 && (
              <><span className="text-status-warning">{degradedCount} degraded</span> — Throughput dort reduziert. </>
            )}
            {pausedCount > 0 && (
              <><span className="text-status-info">{pausedCount} pausiert</span>. </>
            )}
            {degradedCount === 0 && pausedCount === 0 && <>Keine Anomalien im Fenster.</>}
          </p>

          {/* Pulse chart — top-4 workloads stacked, rest folded into "other" */}
          <div className="mt-6 h-[300px] py-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 12, right: 12, left: 0, bottom: 16 }}>
                <defs>
                  {charted.map((w) => {
                    const c = workloadColor(w.slug);
                    return (
                      <linearGradient key={w.slug} id={`g-${w.slug}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.05} />
                      </linearGradient>
                    );
                  })}
                  <linearGradient id="g-__other" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--text-muted)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--text-muted)" stopOpacity={0.04} />
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
                    color: "var(--text-primary)",
                  }}
                  itemStyle={{ color: "var(--text-secondary)" }}
                  labelFormatter={(v) => (v === 0 ? "now" : `${v}m ago`)}
                  formatter={(v, name) => [`${v} ev/s`, name === "__other" ? "other" : (name as string)]}
                />
                <ReferenceLine y={avg} stroke="var(--border-emphasis)" strokeDasharray="2 4"
                  label={{ value: `avg ${avg}`, position: "right", fill: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}
                />
                {charted.map((w) => {
                  const c = workloadColor(w.slug);
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
                {other.length > 0 && (
                  <Area
                    type="monotone"
                    dataKey="__other"
                    stackId="1"
                    stroke="var(--text-muted)"
                    strokeWidth={1}
                    fill="url(#g-__other)"
                    isAnimationActive={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
            {charted.map((w) => (
              <span key={w.slug} className="flex items-center gap-1.5">
                <span className="h-2 w-2" style={{ background: workloadColor(w.slug) }} />
                {w.slug}
              </span>
            ))}
            {other.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-text-muted/50" />
                other ({other.length})
              </span>
            )}
            <span className="ml-auto">y · events/s</span>
          </div>

          {/* Stat strip */}
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

        {/* Right: roster + wire + feed */}
        <aside className="lg:col-span-4 space-y-12">
          <RosterPanel />
          <WirePanel />
          <FeedPanel />
        </aside>
      </div>

      {/* Compact market summary — full desk lives at /market */}
      <MarketSummary />

      {/* Agents on duty — compact grid grouped by workload */}
      <section className="mt-16">
        <div className="flex items-end justify-between border-b hairline pb-2">
          <h2 className="font-serif text-2xl text-text-primary">
            <span className="italic text-text-secondary">Agents</span> on duty
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
            {totalAgents} components
          </span>
        </div>
        <AgentsCompact />
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
    <div className="px-4 py-4">
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
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">by health</span>
      </div>
      {sorted.length === 0 ? (
        <p className="mt-6 font-serif text-text-muted italic">The roster is empty.</p>
      ) : (
        <ul className="mt-1">
          {sorted.map((w, i) => {
            const evps = (w.heartbeatPct / 8).toFixed(1);
            const isZero = w.status === "offline" || w.status === "registered";
            return (
              <li key={w.slug}>
                <Link
                  to="/workloads/$slug"
                  params={{ slug: w.slug }}
                  className="grid grid-cols-[20px_1fr_70px_auto] items-center gap-3 py-2.5 hover:bg-bg-surface/40"
                >
                  <span className="font-mono text-[10px] tabular-nums text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2" style={{ background: workloadColor(w.slug) }} />
                      <span className="font-mono text-[13px] text-text-primary">{w.slug}</span>
                    </div>
                  </div>
                  <div className="h-6">
                    <Sparkline data={w.sparkline} height={24} area={false}
                      color={isZero ? "var(--text-muted)" : workloadColor(w.slug)} />
                  </div>
                  <div className="text-right">
                    <div className={`font-serif text-lg tabular-nums ${isZero ? "text-text-muted" : "text-text-primary"}`}>
                      {isZero ? "0" : evps}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">ev/s</div>
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
          The <span className="italic">wire</span>
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-status-danger">
          {open.length} unresolved
        </span>
      </div>
      {shown.length === 0 ? (
        <p className="mt-4 font-serif italic text-text-muted">All quiet.</p>
      ) : (
        <ul className="mt-1">
          {shown.map((a, i) => (
            <li key={a.id} className="py-2.5">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-sm italic text-text-muted tabular-nums">
                  {roman(i + 1)}.
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    <SeverityTag s={a.severity} /> · {a.source}
                  </div>
                  <div className="mt-0.5 font-serif text-[15px] leading-snug text-text-primary">
                    {a.message}
                  </div>
                  <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-text-muted">
                    <span>×{a.occurrences}</span>
                    <span>·</span>
                    <span>{fmtAgoLong(a.lastSeenSec)} ago</span>
                    <span>·</span>
                    <button
                      onClick={() => ack(a.id)}
                      className="uppercase tracking-[0.18em] text-accent hover:underline"
                    >
                      ack →
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 text-right">
        <Link to="/alerts" className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted hover:text-text-secondary">
          incident desk →
        </Link>
      </div>
    </div>
  );
}

function FeedPanel() {
  const data = useStore((s) => s.data);
  const events = data.events.slice(0, 6);
  return (
    <div>
      <div className="flex items-end justify-between border-b hairline pb-2">
        <h2 className="font-serif text-2xl text-text-primary">
          The <span className="italic">feed</span>
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">live activity</span>
      </div>
      {events.length === 0 ? (
        <p className="mt-4 font-serif italic text-text-muted">Nothing on the wire.</p>
      ) : (
        <ul className="mt-1">
          {events.map((e) => (
            <li key={e.id} className="flex items-baseline gap-3 py-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: eventColor(e.kind) }} />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[12px] text-text-secondary leading-snug">
                  <span className="text-text-primary">{e.source}</span>{" "}
                  <span className="text-text-muted">{eventVerb(e.kind)}</span>{" "}
                  {e.message}
                </div>
                <div className="font-mono text-[10px] text-text-muted">{fmtAgoLong(e.agoSec)} ago</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MarketSummary() {
  const data = useStore((s) => s.data);
  const m = data.market;
  if (!m) return null;
  const positive = m.portfolioDayChangePct >= 0;
  const topTips = m.tips.slice(0, 3);
  const topNews = m.news.slice(0, 3);

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between border-b hairline pb-2">
        <h2 className="font-serif text-2xl text-text-primary">
          The <span className="italic">market</span> desk
        </h2>
        <Link to="/market" className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted hover:text-text-secondary">
          full desk →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
        {/* Portfolio summary */}
        <div className="lg:col-span-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">Portfolio</div>
          <div className="mt-2 font-serif text-4xl tabular-nums text-text-primary">
            €{m.portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`mt-1 flex items-center gap-1 font-mono text-[12px] tabular-nums ${positive ? "text-status-success" : "text-status-danger"}`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {positive ? "+" : ""}{m.portfolioDayChangePct.toFixed(2)}% today
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2">
            {m.indices.map((idx) => {
              const up = idx.changePct >= 0;
              return (
                <div key={idx.name}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">{idx.name}</div>
                  <div className="font-mono text-[12px] tabular-nums text-text-primary">
                    {idx.value.toLocaleString("en-US", { maximumFractionDigits: idx.value > 1000 ? 0 : 2 })}
                    <span className={`ml-1.5 ${up ? "text-status-success" : "text-status-danger"}`}>
                      {up ? "+" : ""}{idx.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top tips */}
        <div className="lg:col-span-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">Today's calls</div>
          <ul className="mt-3 space-y-3">
            {topTips.map((t) => (
              <li key={t.id}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${tipColor(t.action)}`}>{t.action}</span>
                    <span className="ml-2 font-mono text-[12px] text-text-primary">{t.symbol}</span>
                  </div>
                  <span className="font-mono text-[10px] text-text-muted tabular-nums">conf {(t.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-0.5 font-serif text-[13px] leading-snug text-text-secondary">{t.rationale}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Top news */}
        <div className="lg:col-span-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">News on your tape</div>
          <ul className="mt-3 space-y-3">
            {topNews.map((n) => (
              <li key={n.id}>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  <span className="text-text-secondary">{n.source}</span>{" · "}
                  <span className={sentimentColor(n.sentiment)}>{n.sentiment}</span>{" · "}
                  {n.agoMin < 60 ? `${n.agoMin}m` : `${Math.floor(n.agoMin / 60)}h`} ago
                </div>
                <h4 className="mt-0.5 font-serif text-[14px] leading-snug text-text-primary">{n.headline}</h4>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AgentsCompact() {
  const data = useStore((s) => s.data);
  if (data.workloads.length === 0) {
    return <p className="mt-6 font-serif italic text-text-muted">No agents on duty.</p>;
  }
  return (
    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
      {data.workloads.map((w) => (
        <div key={w.slug}>
          <div className="flex items-center gap-2 pb-1.5">
            <span className="h-2 w-2" style={{ background: workloadColor(w.slug) }} />
            <span className="font-mono text-[12px] text-text-primary">{w.slug}</span>
            <span className="font-mono text-[10px] text-text-muted">· {w.agents.length} agents</span>
          </div>
          {w.agents.length === 0 ? (
            <p className="font-mono text-[11px] text-text-muted italic">no agents registered</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4">
              {w.agents.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1 font-mono text-[11px]">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Dot status={a.status === "online" ? "running" : a.status} />
                    <span className="truncate text-text-secondary">{a.name.replace(`${w.slug}-`, "")}</span>
                  </span>
                  <span className={`tabular-nums ${a.status === "offline" ? "text-text-muted" : "text-text-primary"}`}>
                    {a.status === "offline" ? "—" : `${estimateLatency(a)}ms`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
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

function eventColor(kind: string) {
  if (kind.startsWith("alert")) return "var(--status-danger)";
  if (kind.startsWith("command")) return "var(--accent)";
  if (kind === "agent_up" || kind === "workload_registered") return "var(--status-success)";
  if (kind === "agent_down") return "var(--status-warning)";
  return "var(--text-muted)";
}

function eventVerb(kind: string) {
  const map: Record<string, string> = {
    alert_fired: "fired alert:",
    alert_acked: "acked:",
    command_started: "started:",
    command_queued: "queued:",
    command_success: "completed:",
    command_failed: "failed:",
    agent_up: "online —",
    agent_down: "offline —",
    workload_registered: "registered —",
  };
  return map[kind] ?? "—";
}

function roman(n: number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n - 1] ?? String(n);
}

function fmtAgoLong(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function estimateLatency(a: { id: string; status: string }) {
  const seed = a.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = (seed % 130) + 8;
  return a.status === "degraded" ? base + 200 : base;
}
