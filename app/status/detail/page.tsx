import { unstable_cache } from "next/cache";
import type { CSSProperties } from "react";

import BaseLayout from "@/components/BaseLayout";

import { supabase } from "@/lib/supabase";
import type { GeocodeTier } from "@/lib/geocoding";

// Internal-facing scrape observability dashboard (issue #126). This repo has
// no admin auth (see CONTRIBUTING.md: the admin panel is a separate, closed
// deployment), so "internal" here means a deeper, more detailed sibling of
// the public /status page rather than a gated admin route. /status itself is
// already an ungated ops page, so this is consistent with existing
// precedent, not a new exposure.

interface ScraperLog {
  status: string;
  message: string;
  completed_at: string;
}

type TierKey = GeocodeTier | "unresolved";

const TIER_KEYS: TierKey[] = ["city_table", "country_centroid", "google", "nominatim", "unresolved"];

const TIER_LABELS: Record<TierKey, string> = {
  city_table: "Hardcoded city table",
  country_centroid: "Hardcoded country centroid",
  google: "Google Maps API",
  nominatim: "Nominatim (rate-limited)",
  unresolved: "Unresolved",
};

interface FedStats {
  fed: string;
  successCount: number;
  failureCount: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  lastFailureMessage: string | null;
  currentlyFailing: boolean;
}

interface DashboardData {
  federations: FedStats[];
  tierCounts: Record<TierKey, number>;
  tierLastUpdated: string | null;
}

// Success rows look like "[fed:GER] success: 42 tournaments found".
function parseFedSuccessCode(message: string): string | null {
  const m = message.match(/^\[fed:([^\]]+)\]\s*success:/);
  return m ? m[1] : null;
}

// Failure rows are written by the generic logScraperFailure('getLinks:${fed}', reason)
// call, which produces "[getLinks:GER] <reason>".
function parseFedFailureCode(message: string): string | null {
  const m = message.match(/^\[getLinks:([^\]]+)\]/);
  return m ? m[1] : null;
}

function parseFedFailureReason(message: string): string {
  const m = message.match(/^\[getLinks:[^\]]+\]\s*/);
  return m ? message.slice(m[0].length) : message;
}

// Aggregate rows look like:
// "[geocode_tier] city_table:3 country_centroid:1 google:12 nominatim:2 unresolved:0"
function parseGeocodeTierMessage(message: string): Partial<Record<TierKey, number>> | null {
  if (!message.startsWith("[geocode_tier]")) return null;
  const body = message.slice("[geocode_tier]".length).trim();
  const result: Partial<Record<TierKey, number>> = {};
  for (const part of body.split(/\s+/)) {
    const [tier, countStr] = part.split(":");
    if (!tier || countStr === undefined) continue;
    const count = Number(countStr);
    if (!Number.isNaN(count) && (TIER_KEYS as string[]).includes(tier)) {
      result[tier as TierKey] = count;
    }
  }
  return result;
}

const getDashboardData = unstable_cache(
  async (): Promise<DashboardData | null> => {
    const { data, error } = await supabase
      .from("scraper_logs")
      .select("status, message, completed_at")
      .order("completed_at", { ascending: false })
      .limit(8000);

    if (error || !data) return null;

    const rows = data as ScraperLog[];

    const byFed = new Map<string, FedStats>();
    // First event seen per federation while walking rows newest-first is
    // that federation's most recent outcome.
    const mostRecentStatus = new Map<string, "success" | "failure">();

    const tierCounts: Record<TierKey, number> = {
      city_table: 0,
      country_centroid: 0,
      google: 0,
      nominatim: 0,
      unresolved: 0,
    };
    let tierLastUpdated: string | null = null;

    for (const log of rows) {
      if (log.status === "completed") {
        const tiers = parseGeocodeTierMessage(log.message);
        if (tiers) {
          if (!tierLastUpdated) tierLastUpdated = log.completed_at;
          for (const key of TIER_KEYS) {
            tierCounts[key] += tiers[key] ?? 0;
          }
          continue;
        }
      }

      const successFed = log.status === "success" ? parseFedSuccessCode(log.message) : null;
      const failureFed = !successFed && log.status === "failed" ? parseFedFailureCode(log.message) : null;
      const fed = successFed ?? failureFed;
      if (!fed) continue;

      if (!mostRecentStatus.has(fed)) {
        mostRecentStatus.set(fed, successFed ? "success" : "failure");
      }

      const entry: FedStats = byFed.get(fed) ?? {
        fed,
        successCount: 0,
        failureCount: 0,
        lastSuccess: null,
        lastFailure: null,
        lastFailureMessage: null,
        currentlyFailing: false,
      };
      byFed.set(fed, entry);

      if (successFed) {
        entry.successCount++;
        if (!entry.lastSuccess) entry.lastSuccess = log.completed_at;
      } else if (failureFed) {
        entry.failureCount++;
        if (!entry.lastFailure) {
          entry.lastFailure = log.completed_at;
          entry.lastFailureMessage = parseFedFailureReason(log.message);
        }
      }
    }

    const federations = [...byFed.values()].map((entry) => ({
      ...entry,
      currentlyFailing: mostRecentStatus.get(entry.fed) === "failure",
    }));

    federations.sort((a, b) => {
      if (a.currentlyFailing !== b.currentlyFailing) return a.currentlyFailing ? -1 : 1;
      const rateA = a.successCount / Math.max(1, a.successCount + a.failureCount);
      const rateB = b.successCount / Math.max(1, b.successCount + b.failureCount);
      if (rateA !== rateB) return rateA - rateB;
      return a.fed.localeCompare(b.fed);
    });

    return { federations, tierCounts, tierLastUpdated };
  },
  ["status-detail-page"],
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

function successRate(entry: FedStats): number | null {
  const total = entry.successCount + entry.failureCount;
  return total > 0 ? (entry.successCount / total) * 100 : null;
}

const cellStyle: CSSProperties = { padding: "0.6rem", borderBottom: "1px solid var(--border)" };
const headerCellStyle: CSSProperties = { ...cellStyle, fontWeight: 600 };

export default async function StatusDetailPage() {
  const data = await getDashboardData();

  const tierTotal = data
    ? TIER_KEYS.reduce((sum, key) => sum + data.tierCounts[key], 0)
    : 0;

  const failingCount = data ? data.federations.filter((f) => f.currentlyFailing).length : 0;

  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>Scrape <span className="highlight">Observability</span></>}
      heroDescription="Per-federation success rate, failure alerting, and geocoding-tier usage across the 140-federation pipeline."
    >
      <section className="tournament-section">
        <div className="section-container" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {!data ? (
            <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              No scrape data available yet. The first weekly scrape will populate this page.
            </div>
          ) : (
            <>
              {/* ===== Alerting surface ===== */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>
                  Federations currently failing
                  {failingCount > 0 && (
                    <span style={{ color: "#ef4444", fontWeight: 700 }}> ({failingCount})</span>
                  )}
                </h2>
                {failingCount === 0 ? (
                  <p style={{ color: "var(--text-muted)", margin: 0 }}>
                    No federation&apos;s most recent link-collection attempt ended in failure.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                          <th style={headerCellStyle}>Federation</th>
                          <th style={headerCellStyle}>Last failed</th>
                          <th style={headerCellStyle}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.federations
                          .filter((f) => f.currentlyFailing)
                          .map((f) => (
                            <tr key={f.fed} style={{ color: "#ef4444" }}>
                              <td style={{ ...cellStyle, fontWeight: 600 }}>{f.fed}</td>
                              <td style={cellStyle}>{formatDate(f.lastFailure)}</td>
                              <td style={cellStyle}>{f.lastFailureMessage ?? "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ===== Geocoding fallback-tier usage ===== */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Geocoding fallback-tier usage</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 0, marginBottom: "1rem" }}>
                  lib/geocoding.ts resolves an address through 4 tiers in order: a hardcoded city
                  table, hardcoded country centroids, the Google Maps API, then rate-limited
                  Nominatim. This is how often each tier fired, summed across recent scrape runs
                  {data.tierLastUpdated && <> (last updated {formatDate(data.tierLastUpdated)})</>}.
                </p>
                {tierTotal === 0 ? (
                  <p style={{ color: "var(--text-muted)", margin: 0 }}>
                    No geocoding runs logged yet.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {TIER_KEYS.map((key) => {
                      const count = data.tierCounts[key];
                      const pct = tierTotal > 0 ? (count / tierTotal) * 100 : 0;
                      const isDegraded = key === "google" || key === "nominatim";
                      return (
                        <div key={key}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                            <span>{TIER_LABELS[key]}</span>
                            <span style={{ color: "var(--text-muted)" }}>
                              {count.toLocaleString()} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div style={{ background: "var(--border)", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: isDegraded ? "#ef4444" : "var(--text-primary)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ===== Per-federation success rate ===== */}
              <div className="card" style={{ padding: "1.5rem", overflowX: "auto" }}>
                <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Per-federation success rate</h2>
                {data.federations.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", margin: 0 }}>
                    No per-federation logs yet. These are written by the getLinks step in
                    scripts/scrape.ts on every scrape run.
                  </p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                        <th style={headerCellStyle}>Federation</th>
                        <th style={headerCellStyle}>Success rate</th>
                        <th style={headerCellStyle}>Successes</th>
                        <th style={headerCellStyle}>Failures</th>
                        <th style={headerCellStyle}>Last success</th>
                        <th style={headerCellStyle}>Last failure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.federations.map((f) => {
                        const rate = successRate(f);
                        const color = f.currentlyFailing
                          ? "#ef4444"
                          : rate !== null && rate < 80
                            ? "#f59e0b"
                            : "var(--text-primary)";
                        return (
                          <tr key={f.fed} style={{ color, verticalAlign: "top" }}>
                            <td style={{ ...cellStyle, fontWeight: 600 }}>{f.fed}</td>
                            <td style={cellStyle}>{rate !== null ? `${rate.toFixed(0)}%` : "—"}</td>
                            <td style={cellStyle}>{f.successCount}</td>
                            <td style={cellStyle}>{f.failureCount}</td>
                            <td style={cellStyle}>{formatDate(f.lastSuccess)}</td>
                            <td style={cellStyle}>
                              {f.lastFailure ? (
                                <span title={f.lastFailureMessage ?? ""}>{formatDate(f.lastFailure)}</span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "1rem" }}>
                  Success rate is successes / (successes + failures) over the last 8,000 logged
                  events. A federation with a low rate or no logged failures may simply have few
                  live tournaments; check the failure reason before assuming the scraper is broken.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </BaseLayout>
  );
}
