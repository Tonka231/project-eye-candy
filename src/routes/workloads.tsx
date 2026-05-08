import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/mock/store";
import { ModuleCard } from "@/components/ModuleCard";
import { StatusChip } from "@/components/StatusChip";
import { Btn } from "@/components/Btn";
import { TextInput } from "@/components/TextInput";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Boxes } from "lucide-react";

export const Route = createFileRoute("/workloads")({
  head: () => ({
    meta: [
      { title: "Workloads — DEV//DASH" },
      { name: "description", content: "Registered workloads, agent counts and live status." },
    ],
  }),
  component: Workloads,
});

function fmtAgo(s: number) {
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function Workloads() {
  const data = useStore((s) => s.data);
  const register = useStore((s) => s.registerWorkload);
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const slugError = slug && !/^[a-z0-9-]+$/.test(slug) ? "lowercase, digits, dashes only" : undefined;
  const canSubmit = slug && name && baseUrl && !slugError;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Workloads</h1>
          <p className="mt-1 text-sm text-text-muted">{data.workloads.length} registered</p>
        </div>
        {!open && <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>Register</Btn>}
      </div>

      {open && (
        <ModuleCard title="Register workload" subtitle="POST /api/workloads">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextInput
              mono
              label="Slug"
              placeholder="my-worker"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              hint="^[a-z0-9-]+$"
              error={slugError}
            />
            <TextInput label="Name" placeholder="My Worker" value={name} onChange={(e) => setName(e.target.value)} />
            <TextInput mono label="Base URL" placeholder="https://my-worker.internal" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </div>
          <div className="mt-4 flex gap-2">
            <Btn variant="primary" disabled={!canSubmit} onClick={() => {
              register(slug, name, baseUrl);
              setSlug(""); setName(""); setBaseUrl(""); setOpen(false);
            }}>Create</Btn>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </ModuleCard>
      )}

      {data.workloads.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-10 w-10" />}
          title="Keine Workloads registriert"
          description="Registriere einen Workload via UI oder direkt per curl:"
        >
          <pre className="mt-2 rounded-md border border-border-default bg-bg-inset px-4 py-3 text-left font-mono text-[11px] text-text-secondary">
{`curl -X POST https://api.devdash/v1/workloads \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"my-worker","name":"My Worker","base_url":"https://..."}'`}
          </pre>
        </EmptyState>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {data.workloads.map((w) => (
            <Link key={w.slug} to="/workloads/$slug" params={{ slug: w.slug }}>
              <ModuleCard className="h-full transition-colors hover:border-border-emphasis">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-text-muted">{w.slug}</div>
                    <div className="mt-0.5 truncate text-sm font-medium text-text-primary">{w.name}</div>
                  </div>
                  <StatusChip variant={w.status} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-subtle pt-3 text-[11px]">
                  <div>
                    <div className="text-text-muted">Agents</div>
                    <div className="font-mono text-text-primary">{w.agents.length}</div>
                  </div>
                  <div>
                    <div className="text-text-muted">API</div>
                    <div className="font-mono text-text-primary">{w.apiVersion}</div>
                  </div>
                  <div>
                    <div className="text-text-muted">Seen</div>
                    <div className="font-mono text-text-primary">{fmtAgo(w.lastSeenSec)}</div>
                  </div>
                </div>
              </ModuleCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
