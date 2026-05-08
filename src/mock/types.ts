export type WorkloadStatus = "running" | "paused" | "degraded" | "offline" | "registered";
export type AlertSeverity = "critical" | "warning" | "info";
export type CommandStatus = "queued" | "running" | "success" | "failed";
export type CommandAction = "pause" | "resume" | "restart" | "stop" | "flush";
export type EventKind =
  | "alert_fired"
  | "alert_acked"
  | "command_started"
  | "command_queued"
  | "command_success"
  | "command_failed"
  | "agent_up"
  | "agent_down"
  | "workload_registered";

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: "online" | "offline" | "degraded";
  lastSeenSec: number; // seconds since last seen
}

export interface Workload {
  slug: string;
  name: string;
  baseUrl: string;
  apiVersion: string;
  status: WorkloadStatus;
  retentionDays: number;
  registeredAt: string; // ISO date
  lastSeenSec: number;
  heartbeatPct: number; // 0..100
  sparkline: number[]; // 24 buckets
  agents: Agent[];
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  occurrences: number;
  lastSeenSec: number;
  acked: boolean;
}

export interface Command {
  id: string;
  workloadSlug: string;
  action: CommandAction;
  status: CommandStatus;
  requestedSec: number;
}

export interface ActivityEvent {
  id: string;
  kind: EventKind;
  message: string;
  source: string;
  agoSec: number;
}

export interface TrendPoint {
  day: string; // e.g. "Mo"
  value: number;
  isToday?: boolean;
}

export interface TrendSet {
  heartbeats: TrendPoint[];
  commands: TrendPoint[];
  alerts: TrendPoint[];
  latency: TrendPoint[];
}

export interface Stats {
  heartbeats1h: number;
  commands24h: { success: number; failed: number };
  alerts24h: { fired: number; acked: number };
  avgLatencyMs: number;
  heartbeatsSpark: number[];
  commandsSpark: number[];
  alertsSpark: number[];
  latencySpark: number[];
}

export interface Dataset {
  workloads: Workload[];
  alerts: Alert[];
  commands: Command[];
  events: ActivityEvent[];
  trends: TrendSet;
  stats: Stats;
}

export type DemoMode = "empty" | "normal" | "full";
