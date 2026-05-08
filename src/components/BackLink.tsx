import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
