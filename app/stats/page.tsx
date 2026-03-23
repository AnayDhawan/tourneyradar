"use client";

import { useEffect, useState, useCallback } from "react";
import BaseLayout from "@/components/BaseLayout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Period = 'today' | 'week' | 'month' | '6month' | 'lifetime';

interface StatsData {
  total_views: number;
  unique_visitors: number;
  avg_daily_views: number;
  top_paths: { path: string; views: number }[];
  daily_breakdown: { date: string; views: number; visitors: number }[];
  period: Period;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today',    label: 'Today' },
  { key: 'week',     label: 'This Week' },
  { key: 'month',    label: 'This Month' },
  { key: '6month',   label: '6 Months' },
  { key: 'lifetime', label: 'All Time' },
];

function formatAxisDate(iso: string, period: Period) {
  const d = new Date(iso + 'T00:00:00');
  if (period === 'today') return '';
  if (period === 'week') return d.toLocaleDateString('en-US', { weekday: 'short' });
  if (period === '6month' || period === 'lifetime') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", minWidth: "140px" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-primary)" }}>
        {formatTooltipDate(label)}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginTop: "0.2rem" }}>
          {p.name}: <strong>{p.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
      <div style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "0.75rem",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "2.5rem",
        fontWeight: 800,
        color: "var(--text-primary)",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
      <div style={{ height: "12px", width: "60%", background: "var(--border)", borderRadius: "6px", margin: "0 auto 1rem" }} />
      <div style={{ height: "40px", width: "40%", background: "var(--border)", borderRadius: "8px", margin: "0 auto" }} />
    </div>
  );
}

export default function StatsPage() {
  const [activePeriod, setActivePeriod] = useState<Period>('month');
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback((period: Period) => {
    setLoading(true);
    setError(null);
    fetch(`/api/stats?period=${period}&chart=true`)
      .then((r) => {
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then((d: StatsData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load stats. Please try again.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchStats(activePeriod);
  }, [activePeriod, fetchStats]);

  const xAxisInterval = () => {
    if (!data) return 4;
    const len = data.daily_breakdown.length;
    if (len <= 7) return 0;
    if (len <= 30) return 4;
    if (len <= 180) return 29;
    return 59;
  };

  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>TourneyRadar <span className="highlight">Analytics</span></>}
    >
      <section className="tournament-section">
        <div className="section-container">

          {/* ── Period selector ── */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                className={`btn${activePeriod === key ? " btn-primary" : ""}`}
                onClick={() => setActivePeriod(key)}
                style={{ padding: "0.625rem 1.25rem" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Error state ── */}
          {error && (
            <div style={{
              padding: "1.25rem 1.5rem",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "12px",
              color: "var(--text-primary)",
              marginBottom: "2rem",
            }}>
              {error}
            </div>
          )}

          {/* ── Stat cards ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}>
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : data ? (
              <>
                <StatCard
                  label="Total Views"
                  value={data.total_views}
                  sub={PERIODS.find(p => p.key === activePeriod)?.label}
                />
                <StatCard
                  label="Unique Visitors"
                  value={data.unique_visitors}
                  sub="By session ID"
                />
                <StatCard
                  label="Avg Daily Views"
                  value={data.avg_daily_views}
                  sub="Per day in period"
                />
              </>
            ) : null}
          </div>

          {/* ── Line chart ── */}
          <div className="card" style={{ marginBottom: "2rem", padding: "1.75rem" }}>
            <h3 className="font-display" style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
              color: "var(--text-primary)",
            }}>
              Traffic over time
            </h3>

            {loading ? (
              <div style={{
                height: "260px",
                background: "var(--surface-elevated)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}>
                Loading chart…
              </div>
            ) : data && data.daily_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={data.daily_breakdown}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatAxisDate(v, activePeriod)}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={xAxisInterval()}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "0.8125rem", color: "var(--text-secondary)", paddingTop: "1rem" }} />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name="Page Views"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    name="Unique Visitors"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: "260px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}>
                No data yet for this period.
              </div>
            )}
          </div>

          {/* ── Top pages table ── */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h3 className="font-display" style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
              color: "var(--text-primary)",
            }}>
              Top pages
            </h3>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{
                    height: "20px",
                    background: "var(--border)",
                    borderRadius: "4px",
                    width: `${75 - i * 10}%`,
                  }} />
                ))}
              </div>
            ) : data && data.top_paths.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-elevated)" }}>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Path
                      </th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Views
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_paths.map((row, i) => (
                      <tr
                        key={row.path}
                        style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)" }}
                      >
                        <td style={{ padding: "0.875rem 1rem", fontFamily: "monospace", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                          {row.path}
                        </td>
                        <td style={{ padding: "0.875rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                          {row.views.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>
                No data yet for this period.
              </p>
            )}
          </div>

        </div>
      </section>
    </BaseLayout>
  );
}
