import type { ReactNode } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Pause,
  Power,
  PowerOff,
  Loader2,
  Clock,
  Send,
  XCircle,
  Info,
  Circle,
} from "lucide-react";

export type StatusVariant =
  | "running"
  | "paused"
  | "degraded"
  | "offline"
  | "registered"
  | "online"
  | "queued"
  | "success"
  | "failed"
  | "critical"
  | "warning"
  | "info";

const map: Record<
  StatusVariant,
  { label: string; icon: ReactNode; tone: string; bg: string; border: string }
> = {
  running:    { label: "Running",    icon: <Power className="h-3 w-3" />,         tone: "text-status-success", bg: "bg-status-success/10", border: "border-status-success/30" },
  online:     { label: "Online",     icon: <Circle className="h-2 w-2 fill-current" />, tone: "text-status-success", bg: "bg-status-success/10", border: "border-status-success/30" },
  success:    { label: "Success",    icon: <CheckCircle2 className="h-3 w-3" />,  tone: "text-status-success", bg: "bg-status-success/10", border: "border-status-success/30" },
  paused:     { label: "Paused",     icon: <Pause className="h-3 w-3" />,         tone: "text-status-warning", bg: "bg-status-warning/10", border: "border-status-warning/30" },
  warning:    { label: "Warning",    icon: <AlertTriangle className="h-3 w-3" />, tone: "text-status-warning", bg: "bg-status-warning/10", border: "border-status-warning/30" },
  degraded:   { label: "Degraded",   icon: <AlertTriangle className="h-3 w-3" />, tone: "text-status-warning", bg: "bg-status-warning/10", border: "border-status-warning/30" },
  failed:     { label: "Failed",     icon: <XCircle className="h-3 w-3" />,       tone: "text-status-danger",  bg: "bg-status-danger/10",  border: "border-status-danger/30" },
  critical:   { label: "Critical",   icon: <AlertOctagon className="h-3 w-3" />,  tone: "text-status-danger",  bg: "bg-status-danger/10",  border: "border-status-danger/30" },
  offline:    { label: "Offline",    icon: <PowerOff className="h-3 w-3" />,      tone: "text-text-muted",     bg: "bg-bg-elevated",       border: "border-border-default" },
  registered: { label: "Registered", icon: <Send className="h-3 w-3" />,          tone: "text-status-info",    bg: "bg-status-info/10",    border: "border-status-info/30" },
  queued:     { label: "Queued",     icon: <Clock className="h-3 w-3" />,         tone: "text-status-info",    bg: "bg-status-info/10",    border: "border-status-info/30" },
  info:       { label: "Info",       icon: <Info className="h-3 w-3" />,          tone: "text-status-info",    bg: "bg-status-info/10",    border: "border-status-info/30" },
};

interface Props {
  variant: StatusVariant;
  iconOnly?: boolean;
  spinning?: boolean;
  label?: string;
}

export function StatusChip({ variant, iconOnly, spinning, label }: Props) {
  const v = map[variant];
  const icon = spinning ? <Loader2 className="h-3 w-3 animate-spin" /> : v.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider ${v.tone} ${v.bg} ${v.border}`}
    >
      {icon}
      {!iconOnly && <span>{label ?? v.label}</span>}
    </span>
  );
}
