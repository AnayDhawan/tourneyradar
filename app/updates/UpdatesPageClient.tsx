"use client";

import { Fragment } from "react";
import BaseLayout from "@/components/BaseLayout";
import type { ChangelogRelease } from "@/lib/changelog";

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

// The changelog bullets are plain Markdown snippets (`code` and [text](url)
// links only, never block-level content), so a full Markdown renderer would
// be overkill inside a <li>. This just resolves those two inline forms.
const INLINE_MD_RE = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = INLINE_MD_RE.exec(text))) {
    if (match.index > lastIndex) nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    if (match[1] !== undefined) {
      nodes.push(<code key={key++}>{match[1]}</code>);
    } else {
      nodes.push(
        <a key={key++} href={match[3]} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
          {match[2]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  return nodes;
}

export default function UpdatesPageClient({ releases }: { releases: ChangelogRelease[] }) {
  return (
    <BaseLayout
      showHero
      heroTitle={<>Updates &amp; <span className="highlight">Changelog</span></>}
      heroDescription="What shipped on TourneyRadar, newest first."
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "800px" }}>
          {releases.length === 0 && (
            <div className="card">
              <p style={{ color: "var(--text-secondary)" }}>No releases logged yet.</p>
            </div>
          )}

          {releases.map((release) => {
            const date = formatDate(release.date);
            return (
              <div key={release.version} className="card" style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <h2 className="font-display" style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {release.version === "Unreleased" ? "Unreleased" : `v${release.version}`}
                  </h2>
                  {date && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        background: "var(--surface-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "999px",
                        padding: "0.25rem 0.75rem",
                      }}
                    >
                      {date}
                    </span>
                  )}
                  {!date && release.version === "Unreleased" && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--primary)",
                        background: "var(--surface-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "999px",
                        padding: "0.25rem 0.75rem",
                      }}
                    >
                      In progress
                    </span>
                  )}
                </div>

                {release.description && (
                  <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.25rem" }}>
                    {renderInlineMarkdown(release.description)}
                  </p>
                )}

                {release.sections.map((section) => (
                  <div key={section.title} style={{ marginBottom: "1.25rem" }}>
                    <h3
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        marginBottom: "0.625rem",
                      }}
                    >
                      {section.title}
                    </h3>
                    <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingLeft: "1.125rem" }}>
                      {section.items.map((item, i) => (
                        <li key={i} style={{ color: "var(--text-secondary)", lineHeight: 1.6, fontSize: "0.9375rem" }}>
                          {renderInlineMarkdown(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </BaseLayout>
  );
}
