import { unstable_cache } from "next/cache";

import BaseLayout from "@/components/BaseLayout";

import { getAllUpcomingTournaments, getTournamentStats } from "@/lib/tournaments";
import MonthlyChart from "./MonthlyChart";
import TrafficChart from "./TrafficChart";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Manually logged once a month (no self-hosted analytics infra).
const MONTHLY_TRAFFIC = [
  { month: "Jan 2026", views: 2050, visitors: 1440 },
  { month: "Feb 2026", views: 3020, visitors: 2230 },
  { month: "Mar 2026", views: 3560, visitors: 2650 },
  { month: "Apr 2026", views: 4250, visitors: 2210 },
  { month: "May 2026", views: 2110, visitors: 1580 },
  { month: "Jun 2026", views: 4618, visitors: 3097 },
  { month: "Jul 2026", views: 8564, visitors: 5891 },
  { month: "Aug 2026", views: 5460, visitors: 3610 },
];

const getStats = unstable_cache(
  async () => {
    const [stats, tournaments] = await Promise.all([
      getTournamentStats(),
      getAllUpcomingTournaments(1000),
    ]);

    // Group by month so the chart reflects real data, not a hardcoded array.
    const byMonth = new Map<string, number>();
    for (const t of tournaments) {
      const key = t.date.slice(0, 7); // YYYY-MM
      byMonth.set(key, (byMonth.get(key) || 0) + 1);
    }
    const monthly = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [year, month] = key.split("-");
        return {
          month: `${MONTH_LABELS[Number(month) - 1]} ${year}`,
          count,
        };
      });

    return { stats, monthly };
  },
  ["stats-page"],
  { revalidate: 86400, tags: ["tournaments"] },
);

const STAT_CARDS = [
  { key: "total", label: "Tournaments", color: "var(--primary)" },
  { key: "countries", label: "Countries", color: "#10b981" },
  { key: "mapped", label: "With Map Location", color: "#f59e0b" },
] as const;

export default async function StatsPage() {
  const { stats, monthly } = await getStats();

  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>TourneyRadar <span className="highlight">Analytics</span></>}
    >
      <section className="tournament-section">
        <div className="section-container">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}>
            {STAT_CARDS.map(({ key, label, color }) => (
              <div key={key} className="card" style={{ padding: "1.5rem" }}>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  {label}
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color, lineHeight: 1 }}>
                  {stats[key].toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: "2rem", padding: "1.75rem" }}>
            <h3 className="font-display" style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
              color: "var(--text-primary)",
            }}>
              Monthly Traffic
            </h3>

            <TrafficChart data={MONTHLY_TRAFFIC} />
          </div>

          <div className="card" style={{ marginBottom: "2rem", padding: "1.75rem" }}>
            <h3 className="font-display" style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              marginBottom: "1.5rem",
              color: "var(--text-primary)",
            }}>
              Upcoming Tournaments per Month
            </h3>

            <MonthlyChart data={monthly} />
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}