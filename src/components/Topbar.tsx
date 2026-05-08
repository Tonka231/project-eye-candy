import { useStore } from "@/mock/store";
import { Database } from "lucide-react";

export function Topbar() {
  const { data, apiDown } = useStore();
  const live = !apiDown;
  const stats = [
    { label: "Milestone", value: "M0", accent: true },
    { label: "Workloads", value: data.workloads.length.toString() },
    { label: "Alerts", value: data.alerts.filter((a) => !a.acked).length.toString() },
    { label: "Queue", value: data.commands.filter((c) => c.status === "queued" || c.status === "running").length.toString() },
  ];
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-6 border-b border-border-subtle bg-bg-base/80 px-6 backdrop-blur">
      <div className="flex items-center gap-2 text-xs">
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${live ? "bg-status-success animate-ping" : "bg-status-danger"}`}
          />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-status-success" : "bg-status-danger"}`} />
        </span>
        <span className="font-mono uppercase tracking-wider text-text-secondary">
          {live ? "Live" : "Degraded"}
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-5 ml-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-text-muted">{s.label}</span>
            <span className={`font-mono text-sm ${s.accent ? "text-accent" : "text-text-primary"}`}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono ${
          live ? "border-status-success/30 bg-status-success/10 text-status-success" :
                  "border-status-danger/30 bg-status-danger/10 text-status-danger"
        }`}>
          <Database className="h-3 w-3" />
          DB {live ? "online" : "offline"}
        </div>
      </div>
    </header>
  );
}
