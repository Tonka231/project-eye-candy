import { createFileRoute, notFound } from "@tanstack/react-router";
import { useStore } from "@/mock/store";
import { ModuleCard } from "@/components/ModuleCard";
import { StatusChip } from "@/components/StatusChip";
import { BackLink } from "@/components/BackLink";
import { TopologyTree } from "@/components/TopologyTree";

export const Route = createFileRoute("/workloads/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — DEV//DASH` },
      { name: "description", content: `Topology, agents and status for workload ${params.slug}.` },
    ],
  }),
  component: WorkloadDetail,
});

function WorkloadDetail() {
  const { slug } = Route.useParams();
  const w = useStore((s) => s.data.workloads.find((x) => x.slug === slug));
  if (!w) throw notFound();

  return (
    <div className="space-y-6">
      <BackLink to="/workloads" label="Back to workloads" />

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl text-text-primary">{w.slug}</h1>
        <span className="text-sm text-text-muted">{w.name}</span>
        <span className="font-mono text-[11px] text-text-muted">· {w.apiVersion}</span>
        <StatusChip variant={w.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModuleCard title="Connection">
          <dl className="grid grid-cols-3 gap-y-2 text-xs">
            <dt className="text-text-muted">Base URL</dt>
            <dd className="col-span-2 font-mono text-text-primary truncate">{w.baseUrl}</dd>
            <dt className="text-text-muted">API</dt>
            <dd className="col-span-2 font-mono text-text-primary">{w.apiVersion}</dd>
            <dt className="text-text-muted">Retention</dt>
            <dd className="col-span-2 font-mono text-text-primary">{w.retentionDays} days</dd>
          </dl>
        </ModuleCard>
        <ModuleCard title="Lifecycle">
          <dl className="grid grid-cols-3 gap-y-2 text-xs">
            <dt className="text-text-muted">Agents</dt>
            <dd className="col-span-2 font-mono text-text-primary">{w.agents.length}</dd>
            <dt className="text-text-muted">Registered</dt>
            <dd className="col-span-2 font-mono text-text-primary">{new Date(w.registeredAt).toLocaleDateString()}</dd>
            <dt className="text-text-muted">Heartbeat</dt>
            <dd className="col-span-2 font-mono text-text-primary">{w.heartbeatPct}%</dd>
          </dl>
        </ModuleCard>
      </div>

      <ModuleCard title="Topology" subtitle="Workload → Organizer → Children">
        <TopologyTree workload={w} />
      </ModuleCard>
    </div>
  );
}
