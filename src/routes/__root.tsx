import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useStore } from "@/mock/store";
import logoSrc from "@/assets/logo.png";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="max-w-md text-center">
        <div className="font-serif text-8xl italic text-text-primary">404</div>
        <h2 className="mt-4 font-serif text-2xl text-text-primary">Page not in this edition.</h2>
        <p className="mt-2 text-sm text-text-muted">The route you requested has not been printed.</p>
        <div className="mt-6">
          <Link to="/" className="font-mono text-xs uppercase tracking-widest text-accent hover:underline">
            ← back to the front
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-text-primary">A correction is required.</h1>
        <p className="mt-2 text-sm text-text-muted">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 font-mono text-xs uppercase tracking-widest text-accent hover:underline"
        >
          retry →
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dev · Dash — The Operations Edition" },
      { name: "description", content: "An editorial operations dashboard for distributed workloads, agents and incidents." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body className="bg-bg-base">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}

const NAV: Array<{ label: string; to: "/" | "/workloads" | "/commands" | "/alerts" | "/insights" | "/settings" }> = [
  { label: "Front", to: "/" },
  { label: "Workloads", to: "/workloads" },
  { label: "Commands", to: "/commands" },
  { label: "Incidents", to: "/alerts" },
  { label: "Archive", to: "/insights" },
  { label: "Setup", to: "/settings" },
];

function Shell() {
  const apiDown = useStore((s) => s.apiDown);
  return (
    <div className="min-h-screen w-full bg-bg-base text-text-primary">
      <Masthead />
      {apiDown && (
        <div className="mx-auto max-w-[1280px] px-6">
          <ErrorBanner title="The wire is down">
            All endpoints returning 503 — the front page reflects the last cached edition.
          </ErrorBanner>
        </div>
      )}
      <main className="mx-auto max-w-[1280px] px-6 pb-24">
        <Outlet />
      </main>
      <Colophon />
    </div>
  );
}

function useClientClock() {
  const [s, setS] = useState<{ date: string; time: string }>({ date: "", time: "" });
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setS({
        date: d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
        time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return s;
}

function Masthead() {
  const data = useStore((s) => s.data);
  const apiDown = useStore((s) => s.apiDown);
  const live = !apiDown;
  const { date, time } = useClientClock();

  return (
    <header className="border-b hairline">
      <div className="mx-auto flex max-w-[1280px] items-end justify-between gap-6 px-6 pt-6 pb-3">
        <Link to="/" className="flex items-end gap-3">
          <img src={logoSrc} alt="Dev · Dash" className="h-10 w-10 object-contain" style={{ filter: "invert(1) brightness(1.1)" }} />
          <div className="leading-none">
            <div className="font-serif text-[40px] tracking-tight text-text-primary">
              Dev <span className="text-text-muted">·</span> <span className="italic">Dash</span>
            </div>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-4 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
          <span>Edition</span>
          <span className="text-text-secondary">M0 · Telemetry</span>
          <span className="text-border-emphasis">·</span>
          <span suppressHydrationWarning>{date || "—"}</span>
        </div>
        <NavBar />
      </div>

      {/* Status rail */}
      <div className="border-t hairline">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-1 px-6 py-2 font-mono text-[11px] text-text-muted">
          <span className="flex items-center gap-2">
            <span className="relative inline-flex">
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-status-success" : "bg-status-danger"}`} />
              {live && <span className="absolute inset-0 h-1.5 w-1.5 animate-ping rounded-full bg-status-success opacity-70" />}
            </span>
            <span className={`uppercase tracking-[0.2em] ${live ? "text-status-success" : "text-status-danger"}`}>
              {live ? "Live" : "Degraded"}
            </span>
          </span>
          <Sep />
          <span>Runner polling every 5s</span>
          <Sep />
          <span>Postgres <span className="text-text-secondary">{live ? "ok" : "—"}</span></span>
          <Sep />
          <span>Backend <span className="text-text-secondary">{live ? "ok" : "down"}</span></span>
          <Sep />
          <span>Build <span className="text-text-secondary">m0/a</span></span>
          <span className="ml-auto text-text-muted" suppressHydrationWarning>
            {data.stats.heartbeats1h} ev/h · {data.alerts.filter((a) => !a.acked).length} open{time ? ` · ${time} local` : ""}
          </span>
        </div>
      </div>
    </header>
  );
}

function Sep() {
  return <span className="text-border-emphasis">·</span>;
}

function NavBar() {
  const loc = useLocation();
  return (
    <nav className="hidden lg:flex items-center gap-7 pb-2">
      {NAV.map((n) => {
        const active = n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            className={`font-mono text-[11px] uppercase tracking-[0.22em] transition-colors ${
              active
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <span className={active ? "border-b-2 border-accent pb-1" : "pb-1"}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Colophon() {
  return (
    <footer className="mt-12 border-t hairline">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-6 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
        <span>Dev · Dash — set in Newsreader & JetBrains Mono</span>
        <span>v0.0.1 · milestone <span className="text-accent">m0</span> · groundwork</span>
        <span>printed to your browser at {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </footer>
  );
}
