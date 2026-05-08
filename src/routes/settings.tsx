import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/mock/store";
import { ModuleCard } from "@/components/ModuleCard";
import { ModeToggle } from "@/components/ModeToggle";
import { StatusChip } from "@/components/StatusChip";
import { Btn } from "@/components/Btn";
import { ShieldCheck, KeyRound, Zap } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — DEV//DASH" },
      { name: "description", content: "Demo mode, API outage simulation and milestone status." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const apiDown = useStore((s) => s.apiDown);
  const setApiDown = useStore((s) => s.setApiDown);

  const dod = [
    "Mock-Datasets in 3 Modi",
    "Topology-Tree mit Organizer-Erkennung",
    "Activity Feed + Health Donut",
    "Critical-Alert-First Layout",
    "Insights mit 7-Tage-Trends",
    "API-Outage-Simulation",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Demo-Steuerung & Status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModuleCard title="Backend">
          <dl className="space-y-2 text-xs">
            <Row k="Status" v={<StatusChip variant={apiDown ? "failed" : "online"} label={apiDown ? "Unreachable" : "Reachable"} />} />
            <Row k="Database" v={<StatusChip variant={apiDown ? "offline" : "online"} />} />
            <Row k="Milestone" v={<StatusChip variant="info" label="M0 · groundwork" />} />
          </dl>
        </ModuleCard>

        <ModuleCard title="Demo mode" subtitle="Schaltet den kompletten Datensatz um">
          <ModeToggle value={mode} onChange={setMode} />
          <p className="mt-3 text-[11px] text-text-muted">
            Aktuell: <span className="font-mono text-text-secondary">{mode}</span>
          </p>
        </ModuleCard>

        <ModuleCard title="API outage simulation" subtitle="Setzt Backend auf 503">
          <Btn variant={apiDown ? "danger" : "secondary"} icon={<Zap className="h-3.5 w-3.5" />} onClick={() => setApiDown(!apiDown)}>
            {apiDown ? "Restore API" : "Simulate 503"}
          </Btn>
        </ModuleCard>

        <ModuleCard title="Current milestone" subtitle="Phase: M0 — Groundwork">
          <p className="text-xs text-text-secondary">
            Goal: voll funktionsfähige Operations-UI gegen Mock-Backend, Visual-Sprache final, Komponenten-Inventar komplett.
          </p>
        </ModuleCard>

        <ModuleCard title="Definition of Done" className="md:col-span-2">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dod.map((d) => (
              <li key={d} className="flex items-start gap-2 text-xs text-text-secondary">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success" />
                {d}
              </li>
            ))}
          </ul>
        </ModuleCard>

        <ModuleCard title="Tokens" subtitle="API-Tokens und Auth — kommen in M2" className="md:col-span-2">
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border-default bg-bg-inset px-3 py-3 text-xs text-text-muted">
            <KeyRound className="h-4 w-4 text-accent" />
            Token-Management ist im Milestone M2 vorgesehen. Aktuell läuft alles unauthentifiziert gegen Mock-State.
          </div>
        </ModuleCard>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
