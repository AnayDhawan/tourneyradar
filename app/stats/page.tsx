"use client";

import BaseLayout from "@/components/BaseLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthlyStat {
  month: string;
  views: number;
  visitors: number;
}

// Manually logged once a month (no self-hosted analytics infra).
const MONTHLY_STATS: MonthlyStat[] = [
  { month: "Jan 2026", views: 2050, visitors: 1440 },
  { month: "Feb 2026", views: 3020, visitors: 2230 },
  { month: "Mar 2026", views: 3560, visitors: 2650 },
  { month: "Apr 2026", views: 4250, visitors: 2210 },
  { month: "May 2026", views: 2110, visitors: 1580 },
  { month: "Jun 2026", views: 4618, visitors: 3097 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", minWidth: "140px" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-primary)" }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginTop: "0.2rem" }}>
          {p.name}: <strong>{p.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>TourneyRadar <span className="highlight">Analytics</span></>}
    >
      <section className="tournament-section">
        <div className="section-container">
          <div className="card" style={{ marginBottom: "2rem", padding: "1.75rem" }}>
            <h3 className="font-display" style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
              color: "var(--text-primary)",
            }}>
              Monthly Traffic
            </h3>

            {MONTHLY_STATS.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={MONTHLY_STATS} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "0.8125rem", color: "var(--text-secondary)", paddingTop: "1rem" }} />
                  <Bar dataKey="views" name="Page Views" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="visitors" name="Visitors" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                No data yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
