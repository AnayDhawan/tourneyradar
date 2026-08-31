// Open dataset landing page (issue #130). Describes the export, shows live
// row count / date range / column list, and links to the download route
// (app/api/dataset/route.ts), the license terms (DATASET.md), and the
// scraping methodology writeup (docs/scraping-architecture.md) the issue
// asked this to pair with.

import { unstable_cache } from "next/cache";
import BaseLayout from "@/components/BaseLayout";
import { supabase } from "@/lib/supabase";
import { fetchDatasetRows, buildDatasetMeta, DATASET_COLUMNS } from "@/lib/dataset";

const REPO_URL = "https://github.com/AnayDhawan/tourneyradar";
const DATASET_LICENSE_URL = `${REPO_URL}/blob/main/DATASET.md`;
const SCRAPING_ARCHITECTURE_URL = `${REPO_URL}/blob/main/docs/scraping-architecture.md`;

// Same 1hr window as app/api/dataset/route.ts's own cache, and the same
// "tournaments" tag as app/status's getStats, so both invalidate together.
const getMeta = unstable_cache(
  async () => {
    const rows = await fetchDatasetRows(supabase);
    return buildDatasetMeta(rows);
  },
  ["dataset-page-meta"],
  { revalidate: 3600, tags: ["tournaments"] }
);

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const cardHeading: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 700,
  marginBottom: "1rem",
  color: "var(--text-primary)",
};

const bodyText: React.CSSProperties = {
  color: "var(--text-secondary)",
  lineHeight: 1.8,
};

export default async function DatasetPage() {
  const meta = await getMeta();

  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>Open <span className="highlight">Dataset</span></>}
      heroDescription="The cleaned tournament dataset behind the map, free to download for hobbyist and research use."
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "900px" }}>

          {/* Overview + stats */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={cardHeading}>Overview</h2>
            <p style={{ ...bodyText, marginBottom: "1.5rem" }}>
              This is the same current-state <code className="inline-code">tournaments</code> table
              that powers the map on this site: worldwide over-the-board chess tournaments scraped from
              Chess-Results.com, cleaned, geocoded, and deduplicated. See{" "}
              <a href={SCRAPING_ARCHITECTURE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>
                the scraping architecture writeup
              </a>{" "}
              for exactly how it is collected and what each derived field means.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {meta.rowCount.toLocaleString()}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Tournaments</div>
              </div>
              <div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {meta.countryCount.toLocaleString()}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Countries</div>
              </div>
              <div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {formatDate(meta.dateRangeStart)} – {formatDate(meta.dateRangeEnd)}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Date range</div>
              </div>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "1rem" }}>
              Generated live on request, cached up to 1 hour. Last computed {formatDate(meta.generatedAt)}.
            </p>
          </div>

          {/* Download */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={cardHeading}>Download</h2>
            <p style={{ ...bodyText, marginBottom: "1.5rem" }}>
              Both formats are the same rows. CSV loads straight into a spreadsheet or{" "}
              <code className="inline-code">pandas.read_csv</code>; newline-delimited JSON keeps
              types (booleans, nulls) exact and streams well for larger tooling.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <a href="/api/dataset?format=csv" className="btn btn-primary" style={{ textDecoration: "none" }}>
                Download CSV
              </a>
              <a href="/api/dataset?format=ndjson" className="btn" style={{ textDecoration: "none" }}>
                Download NDJSON
              </a>
            </div>
          </div>

          {/* Columns */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={cardHeading}>Columns</h2>
            <p style={{ ...bodyText, marginBottom: "1rem" }}>
              {DATASET_COLUMNS.length} columns per row:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {DATASET_COLUMNS.map((col) => (
                <code key={col} className="inline-code">{col}</code>
              ))}
            </div>
            <p style={{ ...bodyText, marginTop: "1rem", fontSize: "0.875rem" }}>
              Internal-only fields (organizer contact details, join keys, free-text venue fields)
              are left out. Full column meanings are documented in{" "}
              <a href={SCRAPING_ARCHITECTURE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>
                the scraping architecture writeup
              </a>.
            </p>
          </div>

          {/* License */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={cardHeading}>License &amp; Attribution</h2>
            <p style={{ ...bodyText, marginBottom: "1rem" }}>
              TourneyRadar&apos;s own aggregation and cleaning work on this export is released under{" "}
              <strong>CC0 1.0</strong> (public domain dedication): use it for research, a blog post,
              a model, or anything else, with no permission needed.
            </p>
            <p style={{ ...bodyText, marginBottom: "1rem" }}>
              The underlying tournament facts (that an event exists, its dates, its location) are not
              TourneyRadar&apos;s to license; they originate with the organizers and Chess-Results.com,
              the same disclaimer as on the{" "}
              <a href="/about" style={{ color: "var(--primary)", fontWeight: 600 }}>About page</a>.
            </p>
            <p style={bodyText}>
              Full terms and a suggested attribution line: see{" "}
              <a href={DATASET_LICENSE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>
                DATASET.md
              </a>.
            </p>
          </div>

          {/* v2 note */}
          <div className="card">
            <h2 className="font-display" style={cardHeading}>What&apos;s not in v1</h2>
            <p style={bodyText}>
              This release is current-state only. The append-only{" "}
              <code className="inline-code">tournament_history</code> table (every version of a
              listing, not just the latest) is a natural v2 addition for anyone studying how listings
              change over time, once there is a real usage signal that it is worth the extra weight.
            </p>
          </div>

        </div>
      </section>
    </BaseLayout>
  );
}
