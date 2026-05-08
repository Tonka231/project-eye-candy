import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/mock/store";
import { ModuleCard } from "@/components/ModuleCard";
import { TrendArea, TrendAreaLine } from "@/components/TrendArea";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — DEV//DASH" },
      { name: "description", content: "Seven-day trends for heartbeats, commands, alerts and latency." },
    ],
  }),
  component: Insights,
});

function Insights() {
  const data = useStore((s) => s.data);
  const t = data.trends;

  const todayMax = (arr: { value: number; isToday?: boolean }[]) => {
    const max = Math.max(...arr.map((x) => x.value));
    const today = arr.find((x) => x.isToday);
    return today ? today.value === max && max > 0 : false;
  };

  const charts = [
    { title: "Heartbeats", subtitle: "Letzte 7 Tage", data: t.heartbeats, color: "var(--accent)", line: true },
    { title: "Commands", subtitle: "Erfolgreich + fehlgeschlagen", data: t.commands, color: "var(--status-info)" },
    { title: "Alerts", subtitle: "Gefeuert", data: t.alerts, color: todayMax(t.alerts) ? "var(--status-danger)" : "var(--accent)" },
    { title: "Latency", subtitle: "ms (avg)", data: t.latency, color: todayMax(t.latency) ? "var(--status-danger)" : "var(--status-warning)", line: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Insights</h1>
        <p className="mt-1 text-sm text-text-muted">7-Tage-Trends · heutiger Tag hervorgehoben · rot wenn heute = Maximum</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {charts.map((c) => (
          <ModuleCard key={c.title} title={c.title} subtitle={c.subtitle}>
            {c.line ? <TrendAreaLine data={c.data} color={c.color} /> : <TrendArea data={c.data} color={c.color} />}
          </ModuleCard>
        ))}
      </div>
    </div>
  );
}
