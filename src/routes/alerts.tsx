import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/mock/store";
import { ModuleCard } from "@/components/ModuleCard";
import { StatusChip } from "@/components/StatusChip";
import { FilterPill } from "@/components/FilterPill";
import { Btn } from "@/components/Btn";
import { EmptyState } from "@/components/EmptyState";
import { Bell, AlertOctagon } from "lucide-react";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — DEV//DASH" },
      { name: "description", content: "Open and acknowledged alerts grouped by severity." },
    ],
  }),
  component: Alerts,
});

type Filter = "all" | "open" | "acked" | "critical";

function fmtAgo(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

function Alerts() {
  const data = useStore((s) => s.data);
  const ack = useStore((s) => s.ackAlert);
  const [filter, setFilter] = useState<Filter>("open");

  const counts = {
    all: data.alerts.length,
    open: data.alerts.filter((a) => !a.acked).length,
    acked: data.alerts.filter((a) => a.acked).length,
    critical: data.alerts.filter((a) => a.severity === "critical").length,
  };
  const list = data.alerts.filter((a) =>
    filter === "all" ? true :
    filter === "open" ? !a.acked :
    filter === "acked" ? a.acked :
    a.severity === "critical"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Alerts</h1>
        <p className="mt-1 text-sm text-text-muted">Severity-getriebene Operations-Signale</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterPill label="Open" count={counts.open} active={filter === "open"} onClick={() => setFilter("open")} />
        <FilterPill label="Acknowledged" count={counts.acked} active={filter === "acked"} onClick={() => setFilter("acked")} />
        <FilterPill label="⚠ Critical" count={counts.critical} active={filter === "critical"} onClick={() => setFilter("critical")} tone="danger" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Bell className="h-10 w-10" />} title="Keine Alerts" description="In diesem Filter gibt es nichts zu zeigen." />
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li key={a.id}>
              <ModuleCard>
                <div className="flex items-start gap-4">
                  <StatusChip variant={a.severity} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-text-primary">{a.message}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-text-muted">
                      <span>source: <span className="text-text-secondary">{a.source}</span></span>
                      <span>·</span>
                      <span>×{a.occurrences}</span>
                      <span>·</span>
                      <span>last seen {fmtAgo(a.lastSeenSec)} ago</span>
                    </div>
                  </div>
                  {a.acked ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-status-success/30 bg-status-success/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-status-success">
                      ack'd
                    </span>
                  ) : (
                    <Btn variant="primary" onClick={() => ack(a.id)} icon={<AlertOctagon className="h-3.5 w-3.5" />}>Ack</Btn>
                  )}
                </div>
              </ModuleCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
