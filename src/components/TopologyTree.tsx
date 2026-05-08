import type { Workload } from "@/mock/types";
import { StatusChip } from "./StatusChip";

interface Props {
  workload: Workload;
}

export function TopologyTree({ workload }: Props) {
  const organizerRegex = /organizer|coordinator|lead|master|orchestrator/i;
  const organizer = workload.agents.find((a) => organizerRegex.test(a.role));
  const children = workload.agents.filter((a) => a !== organizer);

  if (workload.agents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-default p-8 text-center text-xs text-text-muted">
        Keine Agenten registriert.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto flex min-w-fit flex-col items-center py-6">
        {/* Workload root */}
        <div className="rounded-md border border-border-default bg-bg-inset px-4 py-2 text-center">
          <div className="font-mono text-[11px] text-text-muted uppercase tracking-wider">workload</div>
          <div className="font-mono text-sm text-text-primary">{workload.slug}</div>
        </div>

        {/* Trunk */}
        <div className="my-2 h-8 w-px bg-border-default" />

        {organizer && (
          <>
            <div className="rounded-lg border border-accent/50 bg-accent/10 px-5 py-3 text-center accent-glow">
              <div className="font-mono text-[10px] uppercase tracking-wider text-accent">organizer</div>
              <div className="mt-0.5 font-mono text-sm text-text-primary">{organizer.name}</div>
              <div className="mt-1 font-mono text-[11px] text-text-secondary">
                {organizer.lastSeenSec < 30 ? (
                  <span className="text-status-success">♥ live</span>
                ) : (
                  <span className="text-status-warning">♥ {organizer.lastSeenSec}s ago</span>
                )}
              </div>
            </div>

            {/* Fan-out SVG */}
            {children.length > 0 && (
              <FanOut count={children.length} />
            )}
          </>
        )}

        {children.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {children.map((a) => (
              <div key={a.id} className="relative w-[160px] rounded-md border border-border-default bg-bg-surface p-3">
                <span
                  className={`pulse-dot absolute right-2 top-2 inline-block h-2 w-2 rounded-full ${
                    a.status === "online" ? "text-status-success bg-status-success" :
                    a.status === "degraded" ? "text-status-warning bg-status-warning" :
                    "text-text-muted bg-text-muted"
                  }`}
                />
                <div className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{a.role}</div>
                <div className="mt-0.5 truncate font-mono text-xs text-text-primary">{a.name}</div>
                <div className="mt-2">
                  <StatusChip
                    variant={a.status === "online" ? "online" : a.status === "degraded" ? "degraded" : "offline"}
                    iconOnly
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-text-muted">
        <span className="flex items-center gap-2">
          <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="var(--border-emphasis)" strokeWidth="1" strokeDasharray="3 3" /></svg>
          Topologie
        </span>
        <span className="text-text-muted">·</span>
        <span>Live-Kommunikation kommt in M1</span>
      </div>
    </div>
  );
}

function FanOut({ count }: { count: number }) {
  const width = Math.max(240, count * 60);
  const cx = width / 2;
  const positions = Array.from({ length: count }, (_, i) => ((i + 0.5) / count) * width);
  return (
    <svg width={width} height={32} className="my-1" aria-hidden>
      {positions.map((x, i) => (
        <path
          key={i}
          d={`M ${cx} 0 Q ${cx} 16 ${x} 16 L ${x} 32`}
          stroke="var(--border-emphasis)"
          strokeWidth="1"
          strokeDasharray="3 3"
          fill="none"
        />
      ))}
    </svg>
  );
}
