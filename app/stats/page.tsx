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

type Range = "24h" | "7d" | "30d";

interface UmamiStats {
  pageviews: { value: number };
  visitors: { value: number };
  visits: { value: number };
  bounces: { value: number };
  totaltime: { value: number };
}

interface ChartPoint { x: string; y: number }

interface UmamiPageviews {
  pageviews: ChartPoint[];
  sessions: ChartPoint[];
}

interface MetricRow { x: string; y: number }

interface AnalyticsData {
  stats: UmamiStats;
  pageviews: UmamiPageviews;
  topPages: MetricRow[];
  topReferrers: MetricRow[];
  topCountries: MetricRow[];
}

const RANGES: { key: Range; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatAxisDate(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === "24h") return d.toLocaleTimeString("en-US", { hour: "numeric" });
  if (range === "7d") return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  const formatted = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="card" style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", minWidth: "140px" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-primary)" }}>
        {formatted}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginTop: "0.2rem" }}>
          {p.name}: <strong>{p.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
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

function MetricTable({ title, rows, colLabel }: { title: string; rows: MetricRow[]; colLabel: string }) {
  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      <h3 className="font-display" style={{
        fontSize: "1.125rem",
        fontWeight: 700,
        marginBottom: "1.5rem",
        color: "var(--text-primary)",
        padding: "1.75rem 1.75rem 0",
      }}>
        {title}
      </h3>
      {rows.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-elevated)" }}>
                <th style={{ padding: "0.75rem 1.75rem", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {colLabel}
                </th>
                <th style={{ padding: "0.75rem 1.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Views
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.x}
                  style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)" }}
                >
                  <td style={{ padding: "0.875rem 1.75rem", fontFamily: "monospace", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                    {row.x || "(direct)"}
                  </td>
                  <td style={{ padding: "0.875rem 1.75rem", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {row.y.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
          No data for this period.
        </p>
      )}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="card" style={{ marginBottom: "2rem", padding: "1.75rem" }}>
      <div style={{ height: "20px", width: "30%", background: "var(--border)", borderRadius: "4px", marginBottom: "1.5rem" }} />
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ height: "16px", background: "var(--border)", borderRadius: "4px", marginBottom: "0.75rem", width: `${75 - i * 10}%` }} />
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((r: Range) => {
    setLoading(true);
    setError(null);
    fetch(`/api/analytics?range=${r}`)
      .then(res => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((d: AnalyticsData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load analytics. Please try again.");
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  // Build chart data by merging pageviews + sessions arrays
  const chartData = data
    ? data.pageviews.pageviews.map((pv) => {
        const session = data.pageviews.sessions.find(s => s.x === pv.x);
        return { date: pv.x, pageviews: pv.y, sessions: session?.y ?? 0 };
      })
    : [];

  // Derived metrics
  const bounceRate = data
    ? ((data.stats.bounces.value / Math.max(data.stats.visits.value, 1)) * 100).toFixed(1) + "%"
    : "—";
  const avgDuration = data
    ? formatDuration(data.stats.totaltime.value / Math.max(data.stats.visits.value, 1) / 1000)
    : "—";

  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>TourneyRadar <span className="highlight">Analytics</span></>}
    >
      <section className="tournament-section">
        <div className="section-container">

          {/* Range selector */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            {RANGES.map(({ key, label }) => (
              <button
                key={key}
                className={`btn${range === key ? " btn-primary" : ""}`}
                onClick={() => setRange(key)}
                style={{ padding: "0.625rem 1.25rem" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Error */}
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

          {/* Stat cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}>
            {loading ? (
              <>
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
                <SkeletonCard /><SkeletonCard />
              </>
            ) : data ? (
              <>
                <StatCard label="Total Pageviews" value={data.stats.pageviews.value} />
                <StatCard label="Unique Visitors" value={data.stats.visitors.value} />
                <StatCard label="Visits" value={data.stats.visits.value} />
                <StatCard label="Bounce Rate" value={bounceRate} />
                <StatCard label="Avg Session Duration" value={avgDuration} />
              </>
            ) : null}
          </div>

          {/* Line chart */}
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
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => formatAxisDate(v, range)}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
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
                  <Line type="monotone" dataKey="pageviews" name="Page Views" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                No data yet for this period.
              </div>
            )}
          </div>

          {/* Tables */}
          {loading ? (
            <>
              <SkeletonTable />
              <SkeletonTable />
              <SkeletonTable />
            </>
          ) : data ? (
            <>
              <MetricTable title="Top Pages" rows={data.topPages} colLabel="Path" />
              <MetricTable title="Top Referrers" rows={data.topReferrers} colLabel="Referrer" />
              <MetricTable title="Top Countries" rows={data.topCountries} colLabel="Country" />
            </>
          ) : null}

        </div>
      </section>
    </BaseLayout>
  );
}
