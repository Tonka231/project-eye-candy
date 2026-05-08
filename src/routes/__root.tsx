import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useStore } from "@/mock/store";
import { Sparkles } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="max-w-md text-center">
        <h1 className="font-mono text-7xl text-accent">404</h1>
        <h2 className="mt-4 text-xl font-medium text-text-primary">Route not found</h2>
        <p className="mt-2 text-sm text-text-muted">
          Diese Seite existiert nicht im Dashboard.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent/90"
          >
            Zurück zur Übersicht
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
        <h1 className="text-xl font-medium text-text-primary">Etwas ist schiefgelaufen</h1>
        <p className="mt-2 text-sm text-text-muted">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-inverse"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DEV//DASH — Workload Operations" },
      { name: "description", content: "Operations dashboard for distributed workloads, agents and alerts." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" },
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

function Shell() {
  const apiDown = useStore((s) => s.apiDown);
  return (
    <div className="min-h-screen flex w-full bg-bg-base text-text-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DemoBanner />
        {apiDown && <ErrorBanner title="API unreachable">All endpoints returning 503 — using last cached state.</ErrorBanner>}
        <Topbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-accent/20 bg-accent/5 px-6 py-1.5 text-[11px] font-mono uppercase tracking-wider text-text-secondary">
      <Sparkles className="h-3 w-3 text-accent" />
      Demo · alle Daten sind Mock — keine echte API
    </div>
  );
}
