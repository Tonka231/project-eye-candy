import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Item {
  label: string;
  value: number;
  color: string;
}

export function HealthDonut({ items }: { items: Item[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={items} dataKey="value" innerRadius={45} outerRadius={64} paddingAngle={2} stroke="none" isAnimationActive={false}>
              {items.map((it, i) => (
                <Cell key={i} fill={it.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl text-text-primary">{total}</span>
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Total</span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 text-xs">
        {items.map((it) => (
          <li key={it.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-text-secondary">
              <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
              {it.label}
            </span>
            <span className="font-mono text-text-primary">{it.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
