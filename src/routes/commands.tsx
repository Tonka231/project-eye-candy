import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/mock/store";
import { ModuleCard } from "@/components/ModuleCard";
import { StatusChip } from "@/components/StatusChip";
import { Btn } from "@/components/Btn";
import { Pause, Play, RotateCw, Square, Info } from "lucide-react";

export const Route = createFileRoute("/commands")({
  head: () => ({
    meta: [
      { title: "Commands — DEV//DASH" },
      { name: "description", content: "Issue commands to workloads and inspect recent execution history." },
    ],
  }),
  component: Commands,
});

function fmtAgo(s: number) {
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function Commands() {
  const data = useStore((s) => s.data);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Command Center</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-text-muted">
          <Info className="h-3.5 w-3.5 text-accent" />
          Buttons werden in M2 mit Auth scharfgeschaltet
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModuleCard title="Quick actions" subtitle="Aktiv im Demo-Modus, blockiert in echtem Backend">
          <div className="grid grid-cols-2 gap-2">
            <Btn disabled icon={<Pause className="h-3.5 w-3.5" />}>Pause</Btn>
            <Btn disabled icon={<Play className="h-3.5 w-3.5" />}>Resume</Btn>
            <Btn disabled icon={<RotateCw className="h-3.5 w-3.5" />}>Restart</Btn>
            <Btn disabled icon={<Square className="h-3.5 w-3.5" />}>Stop</Btn>
          </div>
        </ModuleCard>

        <ModuleCard title="Lifecycle" subtitle="Queued → Running → Success/Failed">
          <div className="flex items-center justify-between gap-2 px-2 py-4">
            {[
              { label: "Queued", color: "var(--status-info)" },
              { label: "Running", color: "var(--accent)" },
              { label: "Success", color: "var(--status-success)" },
              { label: "Failed", color: "var(--status-danger)" },
            ].map((s, i, arr) => (
              <div key={s.label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{s.label}</span>
                </div>
                {i < arr.length - 1 && <div className="mx-2 h-px flex-1 bg-border-default" />}
              </div>
            ))}
          </div>
        </ModuleCard>
      </div>

      <ModuleCard title="Recent commands">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left font-mono text-[10px] uppercase tracking-wider text-text-muted">
                <th className="py-2 pr-4 font-normal">ID</th>
                <th className="py-2 pr-4 font-normal">Workload</th>
                <th className="py-2 pr-4 font-normal">Action</th>
                <th className="py-2 pr-4 font-normal">Status</th>
                <th className="py-2 pr-4 font-normal">Requested</th>
              </tr>
            </thead>
            <tbody>
              {data.commands.map((c) => (
                <tr key={c.id} className="border-b border-border-subtle last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-xs text-text-muted">{c.id}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-text-primary">{c.workloadSlug}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-text-secondary">{c.action}</td>
                  <td className="py-2.5 pr-4">
                    <StatusChip variant={c.status} spinning={c.status === "running"} />
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-text-muted">{fmtAgo(c.requestedSec)}</td>
                </tr>
              ))}
              {data.commands.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-xs text-text-muted">Keine Commands</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ModuleCard>
    </div>
  );
}
