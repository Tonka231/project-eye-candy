import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Boxes, Terminal, Bell, BarChart3, Settings } from "lucide-react";
import logo from "@/assets/logo.png";

const items = [
  { to: "/" as const, label: "Home", icon: Home, exact: true },
  { to: "/workloads" as const, label: "Workloads", icon: Boxes },
  { to: "/commands" as const, label: "Commands", icon: Terminal },
  { to: "/alerts" as const, label: "Alerts", icon: Bell },
  { to: "/insights" as const, label: "Insights", icon: BarChart3 },
  { to: "/settings" as const, label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const active = (to: string, exact?: boolean) => (exact ? path === to : path === to || path.startsWith(to + "/"));
  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-border-subtle bg-bg-surface">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border-subtle">
        <img src={logo} alt="DEV//DASH logo" className="h-8 w-8 accent-glow rounded" />
        <div className="font-mono text-[15px] tracking-wider text-text-primary">
          DEV<span className="text-accent">//</span>DASH
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {items.map((it) => {
          const isActive = active(it.to, it.exact);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={[
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent/15 text-text-primary border-l-2 border-accent pl-[10px]"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
              ].join(" ")}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-accent" : ""}`} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border-subtle px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-text-muted">
        <div>v0.4.1-demo</div>
        <div className="mt-0.5 text-accent">M0 · groundwork</div>
      </div>
    </aside>
  );
}
