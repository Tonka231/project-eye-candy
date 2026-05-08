import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Bar, BarChart } from "recharts";
import type { TrendPoint } from "@/mock/types";

interface Props {
  data: TrendPoint[];
  color?: string;
  highlightToday?: boolean;
  height?: number;
}

export function TrendArea({ data, color = "var(--accent)", highlightToday = true, height = 180 }: Props) {
  const id = `g-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={color} stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            cursor={{ fill: "var(--bg-elevated)" }}
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={highlightToday && d.isToday ? color : `url(#${id})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendAreaLine({ data, color = "var(--accent)", height = 180 }: Props) {
  const id = `gl-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.3 }}
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
