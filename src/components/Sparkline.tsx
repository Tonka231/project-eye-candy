import { Area, AreaChart, ResponsiveContainer, Line, LineChart } from "recharts";

interface Props {
  data: number[];
  color?: string;
  area?: boolean;
  height?: number;
}

export function Sparkline({ data, color = "var(--accent)", area = true, height = 32 }: Props) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer>
        {area ? (
          <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <defs>
              <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color})`} isAnimationActive={false} />
          </AreaChart>
        ) : (
          <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
