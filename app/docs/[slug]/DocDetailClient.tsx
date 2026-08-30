"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import BaseLayout from "@/components/BaseLayout";
import { attributionLine } from "@/lib/docs";
import type { Doc } from "@/lib/docs";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default function DocDetailClient({ doc }: { doc: Doc }) {
  return (
    <BaseLayout showHero heroTitle={doc.title} heroDescription={doc.summary ?? undefined}>
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "760px" }}>
          <div style={{ marginBottom: "1rem" }}>
            <Link href="/docs" style={{ color: "var(--text-secondary)", fontSize: "0.875rem", textDecoration: "none" }}>
              ← All Docs
            </Link>
          </div>

          <div className="card">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: "0.5rem",
                marginBottom: "1.5rem",
                paddingBottom: "1.25rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {attributionLine(doc)}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{formatDate(doc.created_at)}</span>
            </div>

            <div className="doc-content">
              <ReactMarkdown>{doc.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
