import type { DemoMode } from "@/mock/types";
import { cn } from "@/lib/utils";

const opts: { value: DemoMode; label: string }[] = [
  { value: "empty", label: "Empty" },
  { value: "normal", label: "Normal" },
  { value: "full", label: "Voll" },
];

interface Props {
  value: DemoMode;
  onChange: (m: DemoMode) => void;
}

export function ModeToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border border-border-default bg-bg-inset p-0.5">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded transition-colors",
            value === o.value
              ? "bg-accent text-text-inverse"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
