"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ChangelogRelease } from "@/lib/changelog";

const STORAGE_KEY = "tr_last_seen_update";

/**
 * "What's new" nudge for returning visitors after a UI change. Fires once
 * per new changelog version (localStorage-tracked), not once per session.
 * Silent on a true first visit -- there's nothing to compare a first-time
 * visitor's "before" against, so it just records the current version and
 * waits for the next real release to say anything.
 */
export default function UpdatesPopup({ latestRelease }: { latestRelease: ChangelogRelease | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!latestRelease) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }

    if (seen === null) {
      try {
        localStorage.setItem(STORAGE_KEY, latestRelease.version);
      } catch {
        // Ignore -- private browsing / storage disabled. Worst case the
        // popup can't remember it was dismissed, not a functional break.
      }
      return;
    }

    // localStorage doesn't exist during SSR and reading it deliberately
    // waits for mount rather than running during render (would either
    // crash on the server or cause a hydration mismatch), so this is a
    // legitimate mount-time external-system read, not a prop-derived reset
    // -- same justification Pepiros's HeroParticles.tsx uses for its
    // matchMedia read.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (seen !== latestRelease.version) setVisible(true);
  }, [latestRelease]);

  if (!visible || !latestRelease) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, latestRelease.version);
    } catch {
      // Ignore, see above.
    }
  };

  const topItems = latestRelease.sections.flatMap((s) => s.items).slice(0, 3);

  return (
    <div
      role="dialog"
      aria-label="What's new"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "1.5rem",
        zIndex: 9000,
        width: "min(22rem, calc(100vw - 3rem))",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        boxShadow: "0 20px 40px var(--shadow-lg)",
        padding: "1.25rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--primary)",
          }}
        >
          What&apos;s new
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "0.125rem",
            lineHeight: 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.625rem" }}>
        The site just got a redesign.
      </p>

      {topItems.length > 0 && (
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.375rem", paddingLeft: "1.125rem", marginBottom: "0.875rem" }}>
          {topItems.map((item, i) => (
            <li key={i} style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {item}
            </li>
          ))}
        </ul>
      )}

      <Link href="/updates" onClick={dismiss} className="btn btn-primary" style={{ display: "inline-block", padding: "0.5rem 1rem", fontSize: "0.8125rem" }}>
        See what&apos;s new
      </Link>
    </div>
  );
}
