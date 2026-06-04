"use client";

import BaseLayout from "@/components/BaseLayout";
import { trackEvent } from "@/lib/track";

const REPO_URL = "https://github.com/AnayDhawan/tourneyradar";
const ISSUE_URL = "https://github.com/AnayDhawan/tourneyradar/issues/new";

export default function ContactPage() {
  return (
    <BaseLayout 
      showHero={true} 
      heroTitle={<>Get in <span className="highlight">Touch</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "700px" }}>
          
          {/* Contact */}
          <div className="card" style={{ marginBottom: "2rem", textAlign: "center" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              Contact
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              Found a bug? Have a suggestion? Reach out!
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="mailto:dhawansanay@gmail.com"
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                Send Email
              </a>
              <a
                href="https://wa.me/918976191515"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ textDecoration: "none", background: "#25D366", color: "white", border: "none" }}
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Open Source & Support */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              Open Source & Support
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1rem" }}>
              TourneyRadar is free and open source. The best way to support it is to
              star the project on GitHub. Stars help it rank higher in GitHub search,
              signal to other players that it is active and trusted, and keep me
              motivated to ship updates and add more tournaments.
            </p>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              Found a bug, want a feature, or noticed a tournament that is missing?
              Open a GitHub issue. It is public, gets tracked, and is the fastest way
              to get it fixed (you can also email or WhatsApp using the buttons above).
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
                onClick={() => trackEvent("star_link", { src: "contact" })}
              >
                ⭐ Star on GitHub
              </a>
              <a
                href={ISSUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ textDecoration: "none", background: "var(--surface-elevated)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
                onClick={() => trackEvent("issue_link", { src: "contact" })}
              >
                Open an Issue
              </a>
            </div>
          </div>

          {/* FAQ */}
          <div className="card">
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
              FAQ
            </h2>

            <div style={{ display: "grid", gap: "1.25rem" }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  How do I register for a tournament?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  Click &quot;View on Chess-Results&quot; on any tournament page to go to the original listing.
                </p>
              </div>

              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  Is TourneyRadar free?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  Yes, it is available to use.
                </p>
              </div>

              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  Where does the data come from?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  We scrape tournaments from Chess-Results.com automatically.
                </p>
              </div>

              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  Missing a tournament?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  We only show tournaments with official website/PDF links. If a tournament 
                  is on Chess-Results but not showing here, it may not meet our criteria.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </BaseLayout>
  );
}
