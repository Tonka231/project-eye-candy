import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, description, children }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-bg-inset/40 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-text-muted">{icon}</div>}
      <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      {description && <p className="mt-1 max-w-md text-xs text-text-muted">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
