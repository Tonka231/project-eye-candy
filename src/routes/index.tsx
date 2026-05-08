import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/mock/store";
import { ModuleCard } from "@/components/ModuleCard";
import { StatusChip } from "@/components/StatusChip";
import { Sparkline } from "@/components/Sparkline";
import { HealthDonut } from "@/components/HealthDonut";
import { Btn } from "@/components/Btn";
import { EmptyState } from "@/components/EmptyState";
import {
  AlertOctagon, Activity, Bell, Boxes, Clock, Pause, Play, Database, Terminal,
  CheckCircle2, XCircle, Send, Zap, Inbox,
} from "lucide-react";
import type { ActivityEvent, EventKind } from "@/mock/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — DEV//DASH" },
      { name: "description", content: "Critical alerts, live workload status, recent activity and quick actions." },
      { property: "og:title", content: "Home — DEV//DASH" },
      { property: "og:description", content: "Live operations overview." },
    ],
  }),
  component: Home,
});

function fmtAgo(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const eventMeta: Record<EventKind, { icon: React.ReactNode; tone: string }> = {
  alert_fired:        { icon: <AlertOctagon className="h-4 w-4" />, tone: "text-status-danger bg-status-danger/15" },
  alert_acked:        { icon: <CheckCircle2 className="h-4 w-4" />, tone: "text-status-success bg-status-success/15" },
  command_started:    { icon: <Terminal className="h-4 w-4" />,    tone: "text-accent bg-accent/15" },
  command_queued:     { icon: <Clock className="h-4 w-4" />,       tone: "text-status-info bg-status-info/15" },
  command_success:    { icon: <CheckCircle2 className="h-4 w-4" />,tone: "text-status-success bg-status-success/15" },
  command_failed:     { icon: <XCircle className="h-4 w-4" />,     tone: "text-status-danger bg-status-danger/15" },
  agent_up:           { icon: <Zap className="h-4 w-4" />,         tone: "text-status-success bg-status-success/15" },
  agent_down:         { icon: <Zap className="h-4 w-4" />,         tone: "text-text-muted bg-bg-elevated" },
  workload_registered:{ icon: <Send className="h-4 w-4" />,        tone: "text-status-info bg-status-info/15" },
};

function Home() {
  const data = useStore((s) => s.data);
  const openCritical = data.alerts.filter((a) => !a.acked && a.severity === "critical");
  const oldestCritical = openCritical.reduce((m, a) => Math.max(m, a.lastSeenSec), 0);

  const featured = data.workloads[0];
  const kpis = [
    { label: "Workloads", value: data.workloads.length, spark: data.stats.heartbeatsSpark, color: "var(--accent)" },
    { label: "Open Alerts", value: data.alerts.filter((a) => !a.acked).length, spark: data.stats.alertsSpark, color: "var(--status-danger)" },
    { label: "Queue", value: data.commands.filter((c) => c.status === "queued" || c.status === "running").length, spark: data.stats.commandsSpark, color: "var(--status-info)" },
  ];

  const running = data.workloads.filter((w) => w.status === "running").length;
  const paused = data.workloads.filter((w) => w.status === "paused").length;
  const other = data.workloads.length - running - paused;

  if (data.workloads.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-10 w-10" />}
        title="Noch keine Workloads"
        description="Wechsle in den Settings auf Modus Normal oder Voll, um Mock-Daten zu sehen — oder registriere unter /workloads einen neuen Workload."
      >
        <Link to="/workloads"><Btn variant="primary">Workload registrieren</Btn></Link>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zone 1 — Critical first */}
      {openCritical.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-status-danger/40 bg-status-danger/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 text-status-danger" />
            <div>
              <div className="text-sm font-medium text-text-primary">
                {openCritical.length} kritische Alerts offen
              </div>
              <div className="font-mono text-[11px] text-text-muted">
                ältester vor {fmtAgo(oldestCritical)}
              </div>
            </div>
          </div>
          <Link to="/alerts">
            <Btn variant="danger">Open alerts</Btn>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {featured && (
          <ModuleCard hero className="lg:col-span-2" title={
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-text-muted">{featured.slug}</span>
              <StatusChip variant={featured.status} />
            </div>
          } subtitle={featured.name}>
            <div className="mt-2 flex items-end gap-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Heartbeat</div>
                <div className="font-mono text-[40px] leading-none text-text-primary">
                  {featured.heartbeatPct}<span className="text-xl text-text-muted">%</span>
                </div>
                <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-text-muted">
                  <span>{featured.agents.length} agents</span>
                  <span>·</span>
                  <span>seen {fmtAgo(featured.lastSeenSec)} ago</span>
                </div>
              </div>
              <div className="flex-1 h-20">
                <Sparkline data={featured.sparkline} height={80} />
              </div>
            </div>
          </ModuleCard>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
          {kpis.map((k) => (
            <ModuleCard key={k.label}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">{k.label}</div>
                  <div className="mt-1 font-mono text-2xl text-text-primary">{k.value}</div>
                </div>
                <div className="w-20 -mr-1">
                  <Sparkline data={k.spark} color={k.color} height={36} />
                </div>
              </div>
            </ModuleCard>
          ))}
        </div>
      </div>

      {/* Zone 2 — Now */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ModuleCard
          className="lg:col-span-3"
          title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-accent" />Activity</span>}
          subtitle="Letzte Events"
        >
          <ul className="divide-y divide-border-subtle">
            {data.events.slice(0, 8).map((e: ActivityEvent) => {
              const m = eventMeta[e.kind];
              return (
                <li key={e.id} className="flex items-start gap-3 py-2.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${m.tone}`}>{m.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-text-primary">{e.message}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-text-muted">
                      {e.source} · vor {fmtAgo(e.agoSec)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ModuleCard>

        <ModuleCard
          className="lg:col-span-2"
          title={<span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-accent" />Workload Health</span>}
        >
          <HealthDonut
            items={[
              { label: "Running", value: running, color: "var(--status-success)" },
              { label: "Paused", value: paused, color: "var(--status-warning)" },
              { label: "Other", value: other, color: "var(--status-neutral)" },
            ]}
          />
          <ul className="mt-4 space-y-1.5 border-t border-border-subtle pt-3">
            {data.workloads.slice(0, 4).map((w) => (
              <li key={w.slug}>
                <Link to="/workloads/$slug" params={{ slug: w.slug }} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-bg-elevated">
                  <span className="flex-1 truncate font-mono text-xs text-text-primary">{w.slug}</span>
                  <div className="w-16 h-5"><Sparkline data={w.sparkline} height={20} area={false} /></div>
                  <StatusChip variant={w.status} iconOnly />
                </Link>
              </li>
            ))}
          </ul>
        </ModuleCard>
      </div>

      {/* Zone 3 — Quick stats + actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Heartbeats 1h", value: data.stats.heartbeats1h.toString(), spark: data.stats.heartbeatsSpark, color: "var(--accent)" },
          { label: "Commands 24h", value: `${data.stats.commands24h.success}✓ ${data.stats.commands24h.failed}✕`, spark: data.stats.commandsSpark, color: "var(--status-info)" },
          { label: "Alerts 24h", value: `${data.stats.alerts24h.fired}↑ ${data.stats.alerts24h.acked}✓`, spark: data.stats.alertsSpark, color: "var(--status-danger)" },
          { label: "Avg Latency", value: `${data.stats.avgLatencyMs}ms`, spark: data.stats.latencySpark, color: "var(--status-warning)" },
        ].map((s) => (
          <ModuleCard key={s.label}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">{s.label}</div>
                <div className="mt-1 font-mono text-base text-text-primary">{s.value}</div>
              </div>
              <div className="w-16 -mr-1"><Sparkline data={s.spark} color={s.color} height={28} /></div>
            </div>
          </ModuleCard>
        ))}
      </div>

      <ModuleCard title="Quick Actions" subtitle="Häufige Operationen — laufen gegen Mock-Backend">
        <div className="flex flex-wrap gap-2">
          <Btn icon={<Pause className="h-3.5 w-3.5" />}>Pause first workload</Btn>
          <Btn icon={<Play className="h-3.5 w-3.5" />}>Resume first workload</Btn>
          <Btn icon={<Database className="h-3.5 w-3.5" />}>Flush telemetry</Btn>
          <Link to="/commands"><Btn variant="primary" icon={<Terminal className="h-3.5 w-3.5" />}>Open Command Center</Btn></Link>
          <Link to="/alerts" className="ml-auto"><Btn variant="ghost" icon={<Bell className="h-3.5 w-3.5" />}>View alerts</Btn></Link>
        </div>
      </ModuleCard>
    </div>
  );
}
