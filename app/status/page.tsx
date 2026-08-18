import { unstable_cache } from "next/cache";

import BaseLayout from "@/components/BaseLayout";

import { supabase } from "@/lib/supabase";

interface ScraperLog {
  status: string;
  message: string;
  completed_at: string;
}

interface RegionStatus {
  region: string;
  lastSuccess: string | null;
  lastSuccessRows: number | null;
  lastFailure: string | null;
  lastFailureMessage: string | null;
}

const STALE_DAYS = 14;

const REGIONS = [
  "europe-west", "europe-east", "americas", "india", "east-asia",
  "southeast-asia", "south-asia", "middle-east-central-asia", "oceania", "africa-me",
] as const;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function parseSuccessMessage(message: string): { region: string; rows: number | null } {
  const regionMatch = message.match(/\[region:([^\]]+)\]/);
  const rowsMatch = message.match(/success: (\d+) tournaments/);
  return {
    region: regionMatch?.[1] ?? "unknown",
    rows: rowsMatch ? Number(rowsMatch[1]) : null,
  };
}

function parseFailureMessage(message: string): string {
  const regionMatch = message.match(/\[region:([^\]]+)\]/);
  return regionMatch ? message.replace(`[region:${regionMatch[1]}]`, "").trim() : message;
}

const getStatus = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from("scraper_logs")
      .select("status, message, completed_at")
      .order("completed_at", { ascending: false })
      .limit(5000);

    if (error || !data) return null;

    const byRegion = new Map<string, RegionStatus>();
    for (const region of REGIONS) {
      byRegion.set(region, {
        region,
        lastSuccess: null,
        lastSuccessRows: null,
        lastFailure: null,
        lastFailureMessage: null,
      });
    }

    for (const log of data as ScraperLog[]) {
      const regionKey = log.message.includes("[region:")
        ? (log.message.match(/\[region:([^\]]+)\]/)?.[1] ?? "other")
        : "other";
      const entry = byRegion.get(regionKey) ?? {
        region: regionKey,
        lastSuccess: null,
        lastSuccessRows: null,
        lastFailure: null,
        lastFailureMessage: null,
      };
      byRegion.set(regionKey, entry);

      if (log.status === "success" && !entry.lastSuccess) {
        const { rows } = parseSuccessMessage(log.message);
        entry.lastSuccess = log.completed_at;
        entry.lastSuccessRows = rows;
      } else if (log.status === "failed" && !entry.lastFailure) {
        entry.lastFailure = log.completed_at;
        entry.lastFailureMessage = parseFailureMessage(log.message);
      }
    }

    return [...byRegion.values()];
  },
  ["status-page"],
  { revalidate: 3600 },
);

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function StatusPage() {
  const regions = await getStatus();

  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>Scraper <span className="highlight">Status</span></>}
      heroDescription="How fresh is the data, region by region."
    >
      <section className="tournament-section">
        <div className="section-container">
          {!regions ? (
            <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              No scrape data available yet. The first weekly scrape will populate this page.
            </div>
          ) : (
            <div className="card" style={{ padding: "1.5rem", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem", borderBottom: "1px solid var(--border)" }}>Region</th>
                    <th style={{ padding: "0.6rem", borderBottom: "1px solid var(--border)" }}>Last successful run</th>
                    <th style={{ padding: "0.6rem", borderBottom: "1px solid var(--border)" }}>Rows written</th>
                    <th style={{ padding: "0.6rem", borderBottom: "1px solid var(--border)" }}>Last failure</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((r) => {
                    const stale = daysSince(r.lastSuccess) !== null && (daysSince(r.lastSuccess) ?? 0) > STALE_DAYS;
                    const color = stale ? "#ef4444" : r.lastSuccess ? "var(--text-primary)" : "var(--text-muted)";
                    return (
                      <tr key={r.region} style={{ color, verticalAlign: "top" }}>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                          {r.region}
                          {stale && <span style={{ color: "#ef4444", fontWeight: 700 }}> — stale</span>}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid var(--border)" }}>
                          {formatDate(r.lastSuccess)}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid var(--border)" }}>
                          {r.lastSuccessRows?.toLocaleString() ?? "—"}
                        </td>
                        <td style={{ padding: "0.6rem", borderBottom: "1px solid var(--border)" }}>
                          {r.lastFailure ? (
                            <span title={r.lastFailureMessage ?? ""}>
                              {formatDate(r.lastFailure)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "1rem" }}>
                A region is flagged stale when it has not completed a successful run in over {STALE_DAYS} days.
              </p>
            </div>
          )}
        </div>
      </section>
    </BaseLayout>
  );
}