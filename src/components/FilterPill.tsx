import { cn } from "@/lib/utils";

interface Props {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  tone?: "default" | "danger";
}

export function FilterPill({ label, active, count, onClick, tone = "default" }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? tone === "danger"
            ? "border-status-danger bg-status-danger/15 text-status-danger"
            : "border-accent bg-accent/15 text-text-primary"
          : "border-border-default bg-bg-surface text-text-secondary hover:border-border-emphasis hover:text-text-primary",
      )}
    >
      {label}
      {count !== undefined && (
        <span className="font-mono text-[11px] opacity-70">{count}</span>
      )}
    </button>
  );
}
