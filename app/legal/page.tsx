"use client";

import Link from "next/link";
import BaseLayout from "../../components/BaseLayout";

export default function LegalPage() {
  return (
    <BaseLayout 
      showHero={true} 
      heroTitle={<>Legal <span className="highlight">Information</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "600px" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            <Link href="/legal/terms" className="card" style={{ textDecoration: "none", display: "block", transition: "transform 0.2s" }}>
              <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                Terms of Service
              </h2>
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                Rules and guidelines for using TourneyRadar
              </p>
            </Link>
            
            <Link href="/legal/privacy" className="card" style={{ textDecoration: "none", display: "block", transition: "transform 0.2s" }}>
              <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                Privacy Policy
              </h2>
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                How we handle and protect your data
              </p>
            </Link>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
