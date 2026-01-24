"use client";

import Link from "next/link";
import BaseLayout from "@/components/BaseLayout";

export default function NotFound() {
  return (
    <BaseLayout showHero={false}>
      <section className="tournament-section" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: "500px" }}>
          <div style={{ fontSize: "4rem", fontWeight: 800, color: "var(--primary)", marginBottom: "1rem" }}>404</div>
          <h1 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
            Page Not Found
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: 1.6 }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" className="btn btn-primary">
              Go Home
            </Link>
            <Link href="/tournaments" className="btn" style={{ background: "var(--surface-elevated)", border: "2px solid var(--border)", color: "var(--text-primary)" }}>
              Browse Tournaments
            </Link>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
