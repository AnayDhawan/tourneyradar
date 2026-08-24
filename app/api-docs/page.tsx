"use client";

import { useState } from "react";
import Link from "next/link";
import BaseLayout from "@/components/BaseLayout";
import { trackEvent } from "@/lib/track";

const API_REPO_URL = "https://github.com/AnayDhawan/tourneyradar-api";
const API_ISSUE_URL = "https://github.com/AnayDhawan/tourneyradar-api/issues/new";
const BASE_URL = "https://tourneyradar-api.vercel.app";

const JS_SNIPPET = `const res = await fetch(
  '${BASE_URL}/v1/tournaments?country=IN&upcoming=true&limit=5'
)
const { data, meta } = await res.json()
console.log(\`Found \${meta.total} tournaments\`)
console.log(data.map((tournament) => tournament.name))`;

const CURL_SNIPPET = `curl "${BASE_URL}/v1/tournaments?country=IN&upcoming=true&limit=5"`;

const PYTHON_SNIPPET = `import requests

BASE_URL = '${BASE_URL}'

res = requests.get(
    f'{BASE_URL}/v1/tournaments',
    params={'country': 'IN', 'upcoming': 'true', 'limit': 5},
    timeout=15,
)
res.raise_for_status()
payload = res.json()
print(f"Found {payload['meta']['total']} tournaments")
print([t['name'] for t in payload['data']])`;

const RESPONSE_SNIPPET = `{
  "data": [
    {
      "id": "cr_1234567",
      "name": "Chennai Open 2026",
      "city": "Chennai",
      "country": "India",
      "country_code": "IN",
      "date": "2026-06-01",
      "end_date": "2026-06-07",
      "category": "Classical",
      "fide_rated": true,
      "rounds": 9,
      "format": "Swiss",
      "lat": 13.0827,
      "lng": 80.2707,
      "source_url": "https://chess-results.com/..."
    }
  ],
  "meta": { "page": 1, "limit": 5, "total": 248, "hasMore": true }
}`;

const NOT_FOUND_SNIPPET = `{ "error": "Tournament not found", "status": 404 }`;

function CodeBlock({ label, snippet }: { label: string; snippet: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      trackEvent("api_docs_copy", { snippet: label });
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable, nothing to fall back to */
    }
  };

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-block-label">{label}</span>
        <button type="button" className="code-block-copy" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code-block">
        <code>{snippet}</code>
      </pre>
    </div>
  );
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

export default function ApiDocsPage() {
  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>API <span className="highlight">Docs</span></>}
      heroDescription="Free tournament data for your own app. No auth, no key, no cost."
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "900px" }}>

          {/* Overview */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={cardHeading}>Overview</h2>
            <p style={{ ...bodyText, marginBottom: "1rem" }}>
              <code className="inline-code">tourneyradar-api</code> is a free, open-source
              REST API serving the same tournament data that powers the map on this site.
              No authentication, no API key, no cost.
            </p>
            <p style={{ ...bodyText, marginBottom: "1rem" }}>
              <strong>Base URL:</strong> <code className="inline-code">{BASE_URL}</code>
            </p>
            <p style={bodyText}>
              Coverage grows every week as the scraper runs. See{" "}
              <Link href="/stats" style={{ color: "var(--primary)", fontWeight: 600 }}>
                Site Analytics
              </Link>{" "}
              for current tournament and country counts. Licensed Apache-2.0.
            </p>
          </div>

          {/* Endpoints */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={cardHeading}>Endpoints</h2>
            <div className="api-table-wrap">
              <table className="api-table">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Params</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code className="inline-code">GET /v1/tournaments</code></td>
                    <td><code className="inline-code">country</code>, <code className="inline-code">category</code>, <code className="inline-code">upcoming</code>, <code className="inline-code">fide_rated</code>, <code className="inline-code">limit</code>, <code className="inline-code">page</code></td>
                    <td>Paginated tournament list</td>
                  </tr>
                  <tr>
                    <td><code className="inline-code">GET /v1/tournaments/:id</code></td>
                    <td>—</td>
                    <td>Single tournament by ID</td>
                  </tr>
                  <tr>
                    <td><code className="inline-code">GET /v1/countries</code></td>
                    <td>—</td>
                    <td>All countries with tournament data</td>
                  </tr>
                  <tr>
                    <td><code className="inline-code">GET /v1/search</code></td>
                    <td><code className="inline-code">q</code> (required), <code className="inline-code">limit</code>, <code className="inline-code">page</code></td>
                    <td>Full-text search across name, organizer, location</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ ...bodyText, marginTop: "1.25rem", fontSize: "0.875rem" }}>
              <code className="inline-code">q</code> has PostgREST filter characters
              (<code className="inline-code">(</code>, <code className="inline-code">)</code>,{" "}
              <code className="inline-code">,</code>) stripped before matching, so they
              can&apos;t break the query.
            </p>
          </div>

          {/* Quick start */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={cardHeading}>Quick Start</h2>
            <CodeBlock label="javascript" snippet={JS_SNIPPET} />
            <CodeBlock label="curl" snippet={CURL_SNIPPET} />
            <CodeBlock label="python" snippet={PYTHON_SNIPPET} />
          </div>

          {/* Response shape */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={cardHeading}>Response Shape</h2>
            <p style={{ ...bodyText, marginBottom: "1rem" }}>
              List endpoints return <code className="inline-code">data</code> plus a{" "}
              <code className="inline-code">meta</code> block for pagination:
            </p>
            <CodeBlock label="response · GET /v1/tournaments" snippet={RESPONSE_SNIPPET} />
            <p style={{ ...bodyText, marginBottom: "0.5rem" }}>
              A missing tournament returns HTTP 404 with:
            </p>
            <CodeBlock label="response · 404" snippet={NOT_FOUND_SNIPPET} />
          </div>

          {/* Rate limiting */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={cardHeading}>Rate Limiting</h2>
            <p style={{ ...bodyText, marginBottom: "1rem" }}>
              There is currently no rate limiting. Responses are cached at the edge, so
              hammering the same query gains you nothing. Be reasonable.
            </p>
            <p style={bodyText}>
              Need bulk access? Open an issue on the API repo and say what you&apos;re
              building. Any future limits will be announced in that repo&apos;s changelog
              before they&apos;re enforced.
            </p>
          </div>

          {/* Build something / support */}
          <div
            className="card"
            style={{
              marginBottom: "2rem",
              background: "linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)",
              color: "white",
            }}
          >
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
              Building Something With This?
            </h2>
            <p style={{ marginBottom: "1.5rem", opacity: 0.95, lineHeight: 1.8 }}>
              The API is its own open-source repo, separate from this site. A star helps
              it get found by other developers looking for chess tournament data, and
              issues (bug reports, feature requests, bulk-access asks) go straight to the
              person who maintains it.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <a
                href={API_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ background: "white", border: "2px solid white", color: "var(--primary)", textDecoration: "none", fontWeight: 700 }}
                onClick={() => trackEvent("star_link", { src: "api_docs", repo: "tourneyradar-api" })}
              >
                ⭐ Star tourneyradar-api
              </a>
              <a
                href={API_ISSUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.5)", color: "white", textDecoration: "none" }}
                onClick={() => trackEvent("issue_link", { src: "api_docs", repo: "tourneyradar-api" })}
              >
                Open an Issue
              </a>
            </div>
          </div>

        </div>
      </section>
    </BaseLayout>
  );
}
