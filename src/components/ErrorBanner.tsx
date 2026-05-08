import { AlertOctagon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  children?: ReactNode;
}

export function ErrorBanner({ title, children }: Props) {
  return (
    <div className="flex items-start gap-3 border-b border-status-danger/40 bg-status-danger/15 px-4 py-2.5 text-sm text-status-danger">
      <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <strong className="font-medium">{title}</strong>
        {children && <span className="ml-2 text-status-danger/80">{children}</span>}
      </div>
    </div>
  );
}
