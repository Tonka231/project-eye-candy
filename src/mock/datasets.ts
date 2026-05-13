import type { Dataset, Workload, Agent, TrendPoint } from "./types";

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function spark(seed: number, len = 24, base = 30, amp = 20): number[] {
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    const v = base + Math.sin(i * 0.6 + seed) * amp + Math.cos(i * 0.3 + seed * 1.7) * (amp * 0.5);
    out.push(Math.max(0, Math.round(v + amp)));
  }
  return out;
}

function trend(values: number[]): TrendPoint[] {
  return DAYS.map((d, i) => ({ day: d, value: values[i], isToday: i === DAYS.length - 1 }));
}

function agents(slug: string, count: number, includeOrganizer = true): Agent[] {
  const roles = ["worker", "fetcher", "indexer", "validator", "publisher", "scout", "analyzer"];
  const out: Agent[] = [];
  if (includeOrganizer) {
    out.push({
      id: `${slug}-org`,
      name: `${slug}-organizer`,
      role: "organizer",
      status: "online",
      lastSeenSec: 4,
    });
  }
  for (let i = 0; i < count - (includeOrganizer ? 1 : 0); i++) {
    out.push({
      id: `${slug}-a${i}`,
      name: `${slug}-${roles[i % roles.length]}-${i + 1}`,
      role: roles[i % roles.length],
      status: i === 2 ? "degraded" : i === 4 ? "offline" : "online",
      lastSeenSec: i === 4 ? 312 : i === 2 ? 78 : 6 + i * 3,
    });
  }
  return out;
}

const workloadDefs: Array<Partial<Workload> & { slug: string; name: string }> = [
  { slug: "market-analyst", name: "Market Analyst & Portfolio Watch", baseUrl: "https://market.internal" },
  { slug: "claude-trader", name: "Claude Trader Bot", baseUrl: "https://trader.internal" },
  { slug: "ingest", name: "Ingest Pipeline", baseUrl: "https://ingest.internal" },
  { slug: "scheduler", name: "Cron Scheduler", baseUrl: "https://sched.internal" },
  { slug: "trend-spotter", name: "HN/Reddit Trend Spotter", baseUrl: "https://spotter.internal" },
  { slug: "cert-watcher", name: "SSL Cert Watcher", baseUrl: "https://certs.internal" },
  { slug: "cost-tracker", name: "Anthropic Cost Tracker", baseUrl: "https://cost.internal" },
];

const marketSnapshot = {
  asOf: "EU session · synthetic feed",
  indices: [
    { name: "S&P 500", value: 5_842.4, changePct: 0.42 },
    { name: "DAX",     value: 19_310.7, changePct: -0.18 },
    { name: "NASDAQ",  value: 18_624.1, changePct: 0.71 },
    { name: "BTC/USD", value: 71_240,   changePct: 1.84 },
  ],
  positions: [
    { symbol: "VWCE.DE", name: "FTSE All-World UCITS ETF", kind: "etf" as const,   shares: 38, avgPrice: 108.4, price: 124.62, dayChangePct: 0.36,  totalChangePct: 14.96 },
    { symbol: "EUNL.DE", name: "iShares Core MSCI World",  kind: "etf" as const,   shares: 22, avgPrice: 82.1,  price: 96.18,  dayChangePct: 0.41,  totalChangePct: 17.15 },
    { symbol: "IUIT.DE", name: "iShares S&P 500 IT Sector",kind: "etf" as const,   shares: 14, avgPrice: 18.6,  price: 24.40,  dayChangePct: 0.92,  totalChangePct: 31.18 },
    { symbol: "NVDA",    name: "NVIDIA Corp",              kind: "stock" as const, shares: 6,  avgPrice: 412.0, price: 487.3,  dayChangePct: 1.21,  totalChangePct: 18.28 },
    { symbol: "ASML.AS", name: "ASML Holding",             kind: "stock" as const, shares: 3,  avgPrice: 740.0, price: 682.5,  dayChangePct: -0.84, totalChangePct: -7.77 },
    { symbol: "BTC",     name: "Bitcoin",                  kind: "crypto" as const,shares: 0.12, avgPrice: 52_300, price: 71_240, dayChangePct: 1.84, totalChangePct: 36.21 },
  ],
  tips: [
    { id: "t1", symbol: "VWCE.DE", action: "hold" as const,  confidence: 0.82, horizon: "long" as const,    rationale: "Breite Diversifikation, niedrige TER. Keine Aktion nötig — Sparplan weiterlaufen lassen." },
    { id: "t2", symbol: "NVDA",    action: "watch" as const, confidence: 0.64, horizon: "swing" as const,   rationale: "Earnings in 9 Tagen. Implied Move ~7%. Vor Earnings keine Vergrößerung der Position." },
    { id: "t3", symbol: "ASML.AS", action: "buy" as const,   confidence: 0.71, horizon: "long" as const,    rationale: "−7.8% seit Einstieg, aber Auftragsbuch +12% YoY. Bei <€670 nachkaufen sinnvoll." },
    { id: "t4", symbol: "BTC",     action: "sell" as const,  confidence: 0.58, horizon: "intraday" as const,rationale: "RSI(14) = 78, überkauft. Teilgewinn (25%) sichern, Stopp auf €68k nachziehen." },
  ],
  news: [
    { id: "n1", source: "Reuters",   headline: "Fed signals possible rate hold through Q1 — Tech rallies",                        symbols: ["NVDA", "IUIT.DE"], sentiment: "bullish" as const,  agoMin: 18  },
    { id: "n2", source: "Bloomberg", headline: "ASML cuts 2026 guidance citing slower China demand",                              symbols: ["ASML.AS"],         sentiment: "bearish" as const,  agoMin: 42  },
    { id: "n3", source: "FT",        headline: "BlackRock files for spot Solana ETF — broader inflows expected",                  symbols: ["BTC"],             sentiment: "bullish" as const,  agoMin: 95  },
    { id: "n4", source: "Handelsblatt", headline: "DAX schließt leicht im Minus — Autobauer belasten den Index",                 symbols: ["EUNL.DE"],         sentiment: "neutral" as const,  agoMin: 130 },
    { id: "n5", source: "CoinDesk",  headline: "BTC dominance climbs to 58% as alt-season indicators cool",                       symbols: ["BTC"],             sentiment: "neutral" as const,  agoMin: 220 },
  ],
  portfolioValue: 18_472.30,
  portfolioDayChangePct: 0.62,
};

function buildWorkload(i: number, agentCount: number, status: Workload["status"], heartbeat: number): Workload {
  const def = workloadDefs[i];
  return {
    slug: def.slug,
    name: def.name,
    baseUrl: def.baseUrl!,
    apiVersion: "v0.4.1",
    status,
    retentionDays: 30,
    registeredAt: new Date(Date.now() - (3 + i) * 86400000).toISOString(),
    lastSeenSec: status === "offline" ? 1820 : 4 + i * 2,
    heartbeatPct: heartbeat,
    sparkline: spark(i + 1, 24, 40, 25),
    agents: agents(def.slug, agentCount),
  };
}

export const empty: Dataset = {
  workloads: [],
  alerts: [],
  commands: [],
  events: [],
  trends: {
    heartbeats: trend([0, 0, 0, 0, 0, 0, 0]),
    commands: trend([0, 0, 0, 0, 0, 0, 0]),
    alerts: trend([0, 0, 0, 0, 0, 0, 0]),
    latency: trend([0, 0, 0, 0, 0, 0, 0]),
  },
  stats: {
    heartbeats1h: 0,
    commands24h: { success: 0, failed: 0 },
    alerts24h: { fired: 0, acked: 0 },
    avgLatencyMs: 0,
    heartbeatsSpark: Array(12).fill(0),
    commandsSpark: Array(12).fill(0),
    alertsSpark: Array(12).fill(0),
    latencySpark: Array(12).fill(0),
  },
};

export const normal: Dataset = {
  market: marketSnapshot,
  workloads: [
    buildWorkload(0, 5, "running", 96),  // market-analyst
    buildWorkload(1, 5, "running", 98),  // claude-trader
    buildWorkload(2, 4, "running", 94),  // ingest
    buildWorkload(3, 4, "paused", 71),   // scheduler
  ],
  alerts: [
    { id: "a1", severity: "warning", source: "claude-trader", message: "Latency spike on order endpoint", occurrences: 4, lastSeenSec: 320, acked: false },
    { id: "a2", severity: "info", source: "ingest", message: "Backlog above 500 events", occurrences: 1, lastSeenSec: 1200, acked: false },
    { id: "a3", severity: "warning", source: "scheduler", message: "Job overran SLA window", occurrences: 2, lastSeenSec: 4600, acked: true },
  ],
  commands: [
    { id: "c1", workloadSlug: "claude-trader", action: "pause", status: "success", requestedSec: 90 },
    { id: "c2", workloadSlug: "ingest", action: "flush", status: "running", requestedSec: 12 },
    { id: "c3", workloadSlug: "scheduler", action: "restart", status: "queued", requestedSec: 4 },
  ],
  events: [
    { id: "e1", kind: "command_started", message: "flush telemetry on ingest", source: "ingest", agoSec: 12 },
    { id: "e2", kind: "alert_fired", message: "Latency spike on order endpoint", source: "claude-trader", agoSec: 320 },
    { id: "e3", kind: "agent_up", message: "trader-validator-3 came online", source: "claude-trader", agoSec: 410 },
    { id: "e4", kind: "command_success", message: "pause completed", source: "claude-trader", agoSec: 600 },
    { id: "e5", kind: "workload_registered", message: "scheduler registered", source: "scheduler", agoSec: 1800 },
    { id: "e6", kind: "alert_acked", message: "Job overran SLA acked by ops", source: "scheduler", agoSec: 4600 },
    { id: "e7", kind: "command_queued", message: "restart queued", source: "scheduler", agoSec: 4 },
    { id: "e8", kind: "agent_down", message: "ingest-fetcher-5 went offline", source: "ingest", agoSec: 7200 },
  ],
  trends: {
    heartbeats: trend([820, 880, 910, 905, 940, 920, 935]),
    commands: trend([12, 14, 9, 18, 22, 16, 19]),
    alerts: trend([2, 1, 3, 2, 4, 2, 3]),
    latency: trend([110, 120, 115, 130, 125, 118, 122]),
  },
  stats: {
    heartbeats1h: 156,
    commands24h: { success: 38, failed: 4 },
    alerts24h: { fired: 6, acked: 4 },
    avgLatencyMs: 122,
    heartbeatsSpark: spark(1, 12, 30, 12),
    commandsSpark: spark(2, 12, 12, 6),
    alertsSpark: spark(3, 12, 4, 3),
    latencySpark: spark(4, 12, 22, 8),
  },
};

export const full: Dataset = {
  workloads: [
    buildWorkload(0, 5, "running", 96),
    buildWorkload(1, 4, "degraded", 72),
    buildWorkload(2, 4, "running", 91),
    buildWorkload(3, 4, "running", 88),
    buildWorkload(4, 3, "paused", 60),
    buildWorkload(5, 3, "running", 99),
  ],
  alerts: [
    { id: "a1", severity: "critical", source: "claude-trader", message: "Order endpoint returning 5xx", occurrences: 12, lastSeenSec: 60, acked: false },
    { id: "a2", severity: "critical", source: "ingest", message: "Pipeline backlog over 5000", occurrences: 7, lastSeenSec: 180, acked: false },
    { id: "a3", severity: "warning", source: "trend-spotter", message: "Reddit fetcher rate-limited", occurrences: 5, lastSeenSec: 220, acked: false },
    { id: "a4", severity: "warning", source: "cert-watcher", message: "Cert expiring in 7 days", occurrences: 1, lastSeenSec: 600, acked: false },
    { id: "a5", severity: "warning", source: "scheduler", message: "Job overran SLA window", occurrences: 3, lastSeenSec: 800, acked: false },
    { id: "a6", severity: "info", source: "cost-tracker", message: "Daily cost above $50", occurrences: 1, lastSeenSec: 1400, acked: false },
    { id: "a7", severity: "warning", source: "ingest", message: "Slow consumer detected", occurrences: 2, lastSeenSec: 2400, acked: true },
    { id: "a8", severity: "info", source: "claude-trader", message: "Position size approached limit", occurrences: 1, lastSeenSec: 3000, acked: true },
    { id: "a9", severity: "warning", source: "trend-spotter", message: "HN endpoint latency high", occurrences: 4, lastSeenSec: 4200, acked: true },
    { id: "a10", severity: "info", source: "scheduler", message: "Schedule recomputed", occurrences: 1, lastSeenSec: 7000, acked: true },
  ],
  commands: [
    { id: "c1", workloadSlug: "claude-trader", action: "pause", status: "running", requestedSec: 6 },
    { id: "c2", workloadSlug: "ingest", action: "restart", status: "running", requestedSec: 18 },
    { id: "c3", workloadSlug: "trend-spotter", action: "flush", status: "queued", requestedSec: 2 },
    { id: "c4", workloadSlug: "scheduler", action: "pause", status: "success", requestedSec: 90 },
    { id: "c5", workloadSlug: "cost-tracker", action: "restart", status: "failed", requestedSec: 320 },
    { id: "c6", workloadSlug: "cert-watcher", action: "resume", status: "success", requestedSec: 800 },
    { id: "c7", workloadSlug: "ingest", action: "flush", status: "success", requestedSec: 1200 },
    { id: "c8", workloadSlug: "claude-trader", action: "resume", status: "success", requestedSec: 1600 },
    { id: "c9", workloadSlug: "scheduler", action: "restart", status: "failed", requestedSec: 2200 },
    { id: "c10", workloadSlug: "trend-spotter", action: "pause", status: "success", requestedSec: 3400 },
    { id: "c11", workloadSlug: "ingest", action: "stop", status: "failed", requestedSec: 4400 },
    { id: "c12", workloadSlug: "claude-trader", action: "restart", status: "success", requestedSec: 6000 },
  ],
  events: [
    { id: "e1", kind: "alert_fired", message: "Order endpoint returning 5xx", source: "claude-trader", agoSec: 60 },
    { id: "e2", kind: "command_started", message: "pause on claude-trader", source: "claude-trader", agoSec: 6 },
    { id: "e3", kind: "alert_fired", message: "Pipeline backlog over 5000", source: "ingest", agoSec: 180 },
    { id: "e4", kind: "command_queued", message: "flush on trend-spotter", source: "trend-spotter", agoSec: 2 },
    { id: "e5", kind: "agent_down", message: "ingest-indexer-3 offline", source: "ingest", agoSec: 240 },
    { id: "e6", kind: "command_failed", message: "restart cost-tracker failed", source: "cost-tracker", agoSec: 320 },
    { id: "e7", kind: "alert_fired", message: "Reddit fetcher rate-limited", source: "trend-spotter", agoSec: 220 },
    { id: "e8", kind: "agent_up", message: "trader-validator-2 online", source: "claude-trader", agoSec: 700 },
    { id: "e9", kind: "command_success", message: "resume on cert-watcher", source: "cert-watcher", agoSec: 800 },
    { id: "e10", kind: "alert_acked", message: "Slow consumer acked", source: "ingest", agoSec: 2400 },
    { id: "e11", kind: "workload_registered", message: "cost-tracker registered", source: "cost-tracker", agoSec: 9000 },
    { id: "e12", kind: "command_success", message: "flush ingest", source: "ingest", agoSec: 1200 },
  ],
  trends: {
    heartbeats: trend([1820, 1880, 1910, 1905, 1940, 1920, 1935]),
    commands: trend([22, 24, 19, 28, 32, 26, 38]),
    alerts: trend([3, 4, 6, 8, 10, 14, 22]),
    latency: trend([110, 130, 145, 160, 190, 230, 310]),
  },
  stats: {
    heartbeats1h: 412,
    commands24h: { success: 86, failed: 14 },
    alerts24h: { fired: 22, acked: 6 },
    avgLatencyMs: 310,
    heartbeatsSpark: spark(5, 12, 60, 18),
    commandsSpark: spark(6, 12, 24, 10),
    alertsSpark: [2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 22],
    latencySpark: [110, 120, 130, 140, 160, 180, 200, 220, 250, 280, 300, 310],
  },
};

export const datasets: Record<"empty" | "normal" | "full", Dataset> = { empty, normal, full };
