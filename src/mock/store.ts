import { create } from "zustand";
import { datasets } from "./datasets";
import type { Agent, Dataset, DemoMode } from "./types";

interface State {
  mode: DemoMode;
  apiDown: boolean;
  data: Dataset;
  tick: number;
  setMode: (m: DemoMode) => void;
  setApiDown: (v: boolean) => void;
  ackAlert: (id: string) => void;
  registerWorkload: (slug: string, name: string, baseUrl: string) => void;
}

export const useStore = create<State>((set, get) => ({
  mode: "normal",
  apiDown: false,
  data: structuredClone(datasets.normal),
  tick: 0,
  setMode: (m) => set({ mode: m, data: structuredClone(datasets[m]) }),
  setApiDown: (v) => set({ apiDown: v }),
  ackAlert: (id) =>
    set((s) => ({
      data: {
        ...s.data,
        alerts: s.data.alerts.map((a) => (a.id === id ? { ...a, acked: true } : a)),
      },
    })),
  registerWorkload: (slug, name, baseUrl) =>
    set((s) => ({
      data: {
        ...s.data,
        workloads: [
          ...s.data.workloads,
          {
            slug,
            name,
            baseUrl,
            apiVersion: "v0.4.1",
            status: "registered" as const,
            retentionDays: 30,
            registeredAt: new Date().toISOString(),
            lastSeenSec: 0,
            heartbeatPct: 0,
            sparkline: Array(24).fill(0) as number[],
            agents: [] as Agent[],
          },
        ],
        events: [
          {
            id: `er-${Date.now()}`,
            kind: "workload_registered" as const,
            message: `${slug} registered`,
            source: slug,
            agoSec: 0,
          },
          ...s.data.events,
        ].slice(0, 12),
      },
    })),
}));

// polling tick — increments seconds since last seen, respects reduced-motion
if (typeof window !== "undefined") {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced) {
    setInterval(() => {
      const s = useStore.getState();
      useStore.setState({
        tick: s.tick + 1,
        data: {
          ...s.data,
          workloads: s.data.workloads.map((w) => ({
            ...w,
            lastSeenSec: w.status === "offline" ? w.lastSeenSec + 5 : Math.max(2, (w.lastSeenSec + 5) % 30),
            agents: w.agents.map((a) => ({
              ...a,
              lastSeenSec: a.status === "offline" ? a.lastSeenSec + 5 : Math.max(2, (a.lastSeenSec + 5) % 40),
            })),
          })),
        },
      });
    }, 5000);
  }
}
