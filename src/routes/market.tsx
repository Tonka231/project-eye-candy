import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/mock/store";
import { ArrowDownRight, ArrowUpRight, Newspaper, Target } from "lucide-react";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Market Desk — Dev · Dash" },
      { name: "description", content: "Portfolio positions, today's calls and the news tape — full desk view." },
      { property: "og:title", content: "Market Desk — Dev · Dash" },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const data = useStore((s) => s.data);
  const m = data.market;

  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!m) {
    return (
      <div className="pt-12">
        <p className="font-serif italic text-text-muted">No market snapshot available.</p>
      </div>
    );
  }

  const positive = m.portfolioDayChangePct >= 0;

  return (
    <div className="pt-8 pb-16">
      <div className="flex items-end justify-between border-b hairline pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-muted">
            <span className="text-accent">●</span> Market desk · by market-analyst
          </div>
          <h1 className="mt-2 font-serif text-[44px] leading-[1.05] tracking-tight text-text-primary md:text-[52px]">
            The <span className="italic">market</span> desk
          </h1>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          {m.asOf}{now ? ` · ${now}` : ""}
        </span>
      </div>

      {/* Indices ribbon */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 border hairline">
        {m.indices.map((idx) => {
          const up = idx.changePct >= 0;
          return (
            <div key={idx.name} className="border-r last:border-r-0 hairline px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">{idx.name}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-xl tabular-nums text-text-primary">
                  {idx.value.toLocaleString("en-US", { maximumFractionDigits: idx.value > 1000 ? 0 : 2 })}
                </span>
                <span className={`flex items-center gap-0.5 font-mono text-[11px] tabular-nums ${up ? "text-status-success" : "text-status-danger"}`}>
                  {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {up ? "+" : ""}{idx.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-10">
        {/* Positions */}
        <div className="lg:col-span-7">
          <div className="flex items-end justify-between pb-2">
            <h2 className="font-serif text-2xl text-text-primary">
              <span className="italic text-text-secondary">Your</span> positions
            </h2>
            <div className="text-right">
              <div className="font-serif text-2xl tabular-nums text-text-primary">
                €{m.portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`font-mono text-[11px] tabular-nums ${positive ? "text-status-success" : "text-status-danger"}`}>
                {positive ? "▲" : "▼"} {Math.abs(m.portfolioDayChangePct).toFixed(2)}% today
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y hairline text-left font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
                  <th className="py-2 pr-3 font-normal">Symbol</th>
                  <th className="py-2 pr-3 font-normal">Kind</th>
                  <th className="py-2 pr-3 text-right font-normal">Shares</th>
                  <th className="py-2 pr-3 text-right font-normal">Price</th>
                  <th className="py-2 pr-3 text-right font-normal">Day</th>
                  <th className="py-2 pr-3 text-right font-normal">Total P/L</th>
                </tr>
              </thead>
              <tbody>
                {m.positions.map((p) => {
                  const dayUp = p.dayChangePct >= 0;
                  const totalUp = p.totalChangePct >= 0;
                  return (
                    <tr key={p.symbol} className="border-b hairline">
                      <td className="py-3 pr-3">
                        <div className="font-mono text-[13px] text-text-primary">{p.symbol}</div>
                        <div className="text-[11px] text-text-muted truncate max-w-[180px]">{p.name}</div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">{p.kind}</td>
                      <td className="py-3 pr-3 text-right font-mono text-[12px] text-text-secondary tabular-nums">
                        {p.shares}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono text-[12px] text-text-primary tabular-nums">
                        {p.price >= 1000 ? p.price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : p.price.toFixed(2)}
                      </td>
                      <td className={`py-3 pr-3 text-right font-mono text-[12px] tabular-nums ${dayUp ? "text-status-success" : "text-status-danger"}`}>
                        {dayUp ? "+" : ""}{p.dayChangePct.toFixed(2)}%
                      </td>
                      <td className={`py-3 pr-3 text-right font-mono text-[12px] tabular-nums ${totalUp ? "text-status-success" : "text-status-danger"}`}>
                        {totalUp ? "+" : ""}{p.totalChangePct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tips */}
        <div className="lg:col-span-5">
          <h2 className="pb-2 font-serif text-2xl text-text-primary">
            <Target className="inline h-4 w-4 mb-1 mr-1.5 text-accent" />
            <span className="italic text-text-secondary">Today&apos;s</span> calls
          </h2>
          <ul className="border-y hairline">
            {m.tips.map((t) => (
              <li key={t.id} className="border-b hairline last:border-b-0 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${tipColor(t.action)}`}>{t.action}</span>
                    <span className="ml-2 font-mono text-[13px] text-text-primary">{t.symbol}</span>
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">· {t.horizon}</span>
                  </div>
                  <span className="font-mono text-[10px] text-text-muted tabular-nums">conf {(t.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-1 font-serif text-[14px] leading-snug text-text-secondary">{t.rationale}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted">
            Synthetic signals · not financial advice
          </p>
        </div>
      </div>

      {/* News wire */}
      <div className="mt-12">
        <div className="flex items-end justify-between border-b hairline pb-2">
          <h2 className="font-serif text-2xl text-text-primary">
            <Newspaper className="inline h-4 w-4 mb-1 mr-1.5 text-accent" />
            <span className="italic text-text-secondary">News</span> on your tape
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-1 mt-2">
          {m.news.map((n) => (
            <article key={n.id} className="border-b hairline py-3">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
                <span className="text-text-secondary">{n.source}</span>
                <span>·</span>
                <span>{n.agoMin < 60 ? `${n.agoMin}m` : `${Math.floor(n.agoMin / 60)}h`} ago</span>
                <span>·</span>
                <span className={sentimentColor(n.sentiment)}>{n.sentiment}</span>
              </div>
              <h4 className="mt-1 font-serif text-[16px] leading-snug text-text-primary">
                {n.headline}
              </h4>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {n.symbols.map((s) => (
                  <span key={s} className="rounded-sm border hairline px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function tipColor(a: "buy" | "sell" | "hold" | "watch") {
  if (a === "buy") return "text-status-success";
  if (a === "sell") return "text-status-danger";
  if (a === "watch") return "text-status-warning";
  return "text-text-secondary";
}

function sentimentColor(s: "bullish" | "bearish" | "neutral") {
  if (s === "bullish") return "text-status-success";
  if (s === "bearish") return "text-status-danger";
  return "text-text-muted";
}
