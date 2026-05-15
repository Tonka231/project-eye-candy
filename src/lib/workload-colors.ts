// Stable, recognizable color per workload slug. Falls back to a deterministic
// pick from the palette for unknown slugs (e.g. user-registered workloads).
const PALETTE = [
  "var(--accent)",
  "var(--status-info)",
  "var(--status-success)",
  "var(--status-warning)",
  "var(--text-secondary)",
  "var(--status-danger)",
  "var(--text-muted)",
];

const FIXED: Record<string, string> = {
  "claude-trader": "var(--accent)",          // indigo
  "market-analyst": "var(--status-warning)", // gold
  "ingest": "var(--status-info)",            // teal
  "scheduler": "var(--status-success)",      // green
  "trend-spotter": "var(--text-secondary)",  // soft white
  "cert-watcher": "var(--status-danger)",    // red
  "cost-tracker": "var(--text-muted)",       // muted
};

export function workloadColor(slug: string): string {
  if (FIXED[slug]) return FIXED[slug];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
