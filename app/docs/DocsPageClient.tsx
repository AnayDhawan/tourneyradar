"use client";

import Link from "next/link";
import BaseLayout from "@/components/BaseLayout";
import { attributionLine } from "@/lib/docs";
import type { Doc } from "@/lib/docs";

type DocCard = Pick<Doc, "id" | "slug" | "title" | "summary" | "author_type" | "author_display_name" | "created_at">;

function DocCardLink({ doc }: { doc: DocCard }) {
  return (
    <Link href={`/docs/${doc.slug}`} className="feature-card" style={{ marginBottom: 0 }}>
      <h3>{doc.title}</h3>
      {doc.summary && <p>{doc.summary}</p>}
      <span className="feature-card-cta" style={{ marginTop: "auto", paddingTop: "1rem" }}>
        {attributionLine(doc)}
      </span>
    </Link>
  );
}

export default function DocsPageClient({
  maintainerDocs,
  userDocs,
}: {
  maintainerDocs: DocCard[];
  userDocs: DocCard[];
}) {
  return (
    <BaseLayout
      showHero
      heroTitle={<>TourneyRadar <span className="highlight">Docs</span></>}
      heroDescription="Guides for finding, registering for, and organizing chess tournaments -- written by maintainers and players."
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "1000px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "2rem" }}>
            <Link href="/docs/new" className="btn btn-primary">
              Write a Doc
            </Link>
          </div>

          <h2 className="font-display" style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
            Guides
          </h2>
          {maintainerDocs.length === 0 ? (
            <div className="card">
              <p style={{ color: "var(--text-secondary)" }}>No maintainer docs published yet.</p>
            </div>
          ) : (
            <div className="feature-grid" style={{ marginTop: 0, marginBottom: "3rem" }}>
              {maintainerDocs.map((doc) => (
                <DocCardLink key={doc.id} doc={doc} />
              ))}
            </div>
          )}

          <h2 className="font-display" style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
            From the community
          </h2>
          {userDocs.length === 0 ? (
            <div className="card">
              <p style={{ color: "var(--text-secondary)" }}>
                No player-written docs yet. <Link href="/docs/new" style={{ color: "var(--primary)", fontWeight: 700 }}>Be the first to write one.</Link>
              </p>
            </div>
          ) : (
            <div className="feature-grid" style={{ marginTop: 0 }}>
              {userDocs.map((doc) => (
                <DocCardLink key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </section>
    </BaseLayout>
  );
}
