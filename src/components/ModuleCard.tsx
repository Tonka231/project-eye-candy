import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  hero?: boolean;
  children?: ReactNode;
}

export function ModuleCard({ title, subtitle, right, hero, children, className, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-lg border border-border-subtle bg-bg-surface p-4",
        hero && "bg-gradient-to-br from-[color-mix(in_oklab,var(--accent)_8%,var(--bg-surface))] to-bg-surface border-border-default accent-glow",
        className,
      )}
    >
      {(title || right) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-medium text-text-primary">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
