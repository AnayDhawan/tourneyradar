"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface FideRatingPoint {
  period: string;
  standard: number | null;
  rapid: number | null;
  blitz: number | null;
}

const SERIES = [
  { key: "standard", name: "Standard", color: "var(--primary)" },
  { key: "rapid", name: "Rapid", color: "#10b981" },
  { key: "blitz", name: "Blitz", color: "#f59e0b" },
] as const;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", minWidth: "160px" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-primary)" }}>
        {label}
      </div>
      {payload
        .filter((p: any) => p.value !== null && p.value !== undefined)
        .map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color, marginTop: "0.2rem" }}>
            {p.name}: <strong>{p.value}</strong>
          </div>
        ))}
    </div>
  );
}

export default function FideRatingChart({ data }: { data: FideRatingPoint[] }) {
  const hasAnyRating = data.some(
    (point) => point.standard !== null || point.rapid !== null || point.blitz !== null
  );

  if (data.length === 0 || !hasAnyRating) {
    return (
      <div
        style={{
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "0.875rem",
          textAlign: "center",
          padding: "0 1rem",
        }}
      >
        No FIDE rating history available yet. FIDE&apos;s ratings site may be
        unreachable, or this FIDE ID has no published rating history.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={["dataMin - 50", "dataMax + 50"]}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "0.8125rem" }} />
        {SERIES.map((series) => (
          <Line
            key={series.key}
            type="monotone"
            dataKey={series.key}
            name={series.name}
            stroke={series.color}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
