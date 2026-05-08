import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  label?: string;
  hint?: string;
  error?: string;
}

export function TextInput({ mono, label, hint, error, className, id, ...rest }: Props) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-text-secondary">{label}</span>}
      <input
        id={id}
        {...rest}
        className={cn(
          "h-9 w-full rounded-md border border-border-default bg-bg-inset px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none",
          mono && "font-mono",
          error && "border-status-danger",
          className,
        )}
      />
      {hint && !error && <span className="mt-1 block text-[11px] text-text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-status-danger">{error}</span>}
    </label>
  );
}
