"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
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

const WorldMap = dynamic(() => import("./WorldMap"), { ssr: false });

type Range = "24h" | "7d" | "30d" | "6m" | "1y" | "all";

interface UmamiStats {
  pageviews: number;
  visitors: number;
  visits: number;
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
  topCountries: MetricRow[];
}

const RANGES: { key: Range; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d",  label: "7d"  },
  { key: "30d", label: "30d" },
  { key: "6m",  label: "6m"  },
  { key: "1y",  label: "1y"  },
  { key: "all", label: "All" },
];

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India", US: "United States", DE: "Germany", FR: "France",
  GB: "United Kingdom", RU: "Russia", CN: "China", ES: "Spain",
  IT: "Italy", PL: "Poland", NL: "Netherlands", UA: "Ukraine",
  BR: "Brazil", AR: "Argentina", AU: "Australia", CA: "Canada",
  JP: "Japan", KR: "South Korea", TR: "Turkey", PH: "Philippines",
  ID: "Indonesia", PK: "Pakistan", NG: "Nigeria", ZA: "South Africa",
  EG: "Egypt", MA: "Morocco", SE: "Sweden", NO: "Norway", DK: "Denmark",
  FI: "Finland", CH: "Switzerland", AT: "Austria", BE: "Belgium",
  PT: "Portugal", GR: "Greece", CZ: "Czech Republic", HU: "Hungary",
  RO: "Romania", RS: "Serbia", HR: "Croatia", SK: "Slovakia",
  BG: "Bulgaria", GE: "Georgia", KZ: "Kazakhstan", IR: "Iran",
  SA: "Saudi Arabia", AE: "UAE", IL: "Israel", MY: "Malaysia",
  SG: "Singapore", TH: "Thailand", VN: "Vietnam", LK: "Sri Lanka",
  CL: "Chile", CO: "Colombia", PE: "Peru", NZ: "New Zealand",
  LT: "Lithuania", LV: "Latvia", EE: "Estonia", BY: "Belarus",
  MX: "Mexico", BD: "Bangladesh", NP: "Nepal", KE: "Kenya",
  GH: "Ghana", TN: "Tunisia", DZ: "Algeria", ET: "Ethiopia",
  UG: "Uganda", ZW: "Zimbabwe", ZM: "Zambia", SN: "Senegal",
  CM: "Cameroon", TZ: "Tanzania", IQ: "Iraq", JO: "Jordan",
  LB: "Lebanon", QA: "Qatar", KW: "Kuwait", UZ: "Uzbekistan",
  AM: "Armenia", AZ: "Azerbaijan", MD: "Moldova", MK: "North Macedonia",
  AL: "Albania", SI: "Slovenia", ME: "Montenegro", BA: "Bosnia",
};

function flagEmoji(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return "🌐";
  return [...alpha2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function formatAxisDate(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === "24h") return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
  if (range === "7d") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
  if (range === "6m" || range === "1y" || range === "all") return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label, range }: any) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  const formatted = (range === "6m" || range === "1y" || range === "all")
    ? d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : range === "30d"
    ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
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

function StatCard({ label, value }: { label: string; value: string | number }) {
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
                  <td style={{ padding: "0.875rem 1.75rem", fontSize: "0.875rem", color: "var(--text-primary)" }}>
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
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [tournamentsByCountry, setTournamentsByCountry] = useState<Record<string, number>>({});
  const [tournamentsLoading, setTournamentsLoading] = useState(true);

  const fetchData = useCallback((r: Range) => {
    setLoading(true);
    setError(null);
    fetch(`/api/analytics?range=${r}`)
      .then((res) => {
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowAllCountries(false);
    fetchData(range);
  }, [range, fetchData]);

  useEffect(() => {
    fetch("/api/tournaments/by-country")
      .then((r) => r.json())
      .then((d: Record<string, number>) => {
        setTournamentsByCountry(d);
        setTournamentsLoading(false);
      })
      .catch(() => setTournamentsLoading(false));
  }, []);

  const countryRows = (data?.topCountries ?? []).map((r: { x: string; y: number }) => ({
    x: `${flagEmoji(r.x)} ${COUNTRY_NAMES[r.x] ?? r.x}`,
    y: r.y,
  }));

  const visitorsByCountry: Record<string, number> = {};
  (data?.topCountries ?? []).forEach((r) => {
    if (r.x) visitorsByCountry[r.x] = r.y;
  });

  const chartData = data
    ? data.pageviews.pageviews.map((pv) => {
        const session = data.pageviews.sessions.find((s) => s.x === pv.x);
        return { date: pv.x, pageviews: pv.y, sessions: session?.y ?? 0 };
      })
    : [];

  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>TourneyRadar <span className="highlight">Analytics</span></>}
    >
      <section className="tournament-section">
        <div className="section-container">

          {/* Range selector: pill toggle */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{
              display: "inline-flex",
              background: "var(--surface-elevated)",
              borderRadius: "10px",
              padding: "4px",
              gap: "2px",
            }}>
              {RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setRange(key)}
                  style={{
                    padding: "0.4rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    borderRadius: "8px",
                    background: range === key ? "var(--primary)" : "transparent",
                    color: range === key ? "white" : "var(--text-secondary)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
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
              </>
            ) : data ? (
              <>
                <StatCard label="Total Pageviews" value={data.stats.pageviews} />
                <StatCard label="Visits" value={data.stats.visits} />
              </>
            ) : null}
          </div>

          {/* Global Reach map */}
          <div className="card" style={{ marginBottom: "2rem", padding: "1.75rem" }}>
            <h3 style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "1.25rem",
            }}>
              Global Reach
            </h3>
            {loading || tournamentsLoading ? (
              <div style={{
                height: "450px",
                background: "var(--surface-elevated)",
                borderRadius: "8px",
              }} />
            ) : (
              <WorldMap
                key={`${range}-${Object.keys(visitorsByCountry).join(',')}`}
                visitorsByCountry={visitorsByCountry}
                tournamentsByCountry={tournamentsByCountry}
              />
            )}
            <div style={{
              display: "flex",
              gap: "1.5rem",
              marginTop: "0.75rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              flexWrap: "wrap",
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                <span style={{
                  width: "12px", height: "12px", borderRadius: "2px",
                  background: "#1e3a5f", display: "inline-block", border: "1px solid #334155",
                }} /> Has visitors (low)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                <span style={{
                  width: "12px", height: "12px", borderRadius: "2px",
                  background: "#3b82f6", display: "inline-block",
                }} /> Has visitors (high)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                <span style={{
                  width: "12px", height: "12px", borderRadius: "2px",
                  background: "#1e293b", border: "1px solid #334155", display: "inline-block",
                }} /> No data
              </span>
            </div>
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
                    interval="preserveStartEnd"
                    tickFormatter={(v) => {
                      if (range === '24h') {
                        const d = new Date(v);
                        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                      }
                      if (range === '7d') {
                        const d = new Date(v);
                        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                      }
                      if (range === '30d') {
                        const d = new Date(v);
                        const dayNum = d.getDate();
                        const todayParity = new Date().getDate() % 2;
                        return dayNum % 2 === todayParity
                          ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          : '';
                      }
                      if (range === '6m' || range === '1y') {
                        const d = new Date(v);
                        return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
                      }
                      if (range === 'all') {
                        const d = new Date(v);
                        return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
                      }
                      return formatAxisDate(v, range);
                    }}
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
                  <Tooltip content={<CustomTooltip range={range} />} />
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

          {/* Top Countries: full width */}
          {loading ? (
            <SkeletonTable />
          ) : data ? (
            <div style={{ overflow: "hidden" }}>
              <div style={showAllCountries ? {
                maxHeight: "400px",
                overflowY: "auto",
                overflowX: "hidden",
                borderRadius: "8px",
                scrollbarWidth: "thin",
                scrollbarColor: "var(--border) transparent",
              } : {
                overflow: "hidden",
              }}>
                <MetricTable
                  title="Top Countries"
                  rows={showAllCountries ? countryRows : countryRows.slice(0, 10)}
                  colLabel="Country"
                />
              </div>
              {countryRows.length > 10 && (
                <button
                  onClick={() => setShowAllCountries(p => !p)}
                  style={{
                    display: "block",
                    margin: "0.5rem auto 0",
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "0.25rem 0.5rem",
                  }}
                >
                  {showAllCountries
                    ? "Show less ↑"
                    : `Show all ${countryRows.length} countries ↓`}
                </button>
              )}
            </div>
          ) : null}

        </div>
      </section>
    </BaseLayout>
  );
}
