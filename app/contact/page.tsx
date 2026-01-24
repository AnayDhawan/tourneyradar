"use client";

import BaseLayout from "@/components/BaseLayout";

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
                href="mailto:help@tourneyradar.com"
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

          {/* About */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              About TourneyRadar
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              TourneyRadar is a free, open-source chess tournament aggregator. We scrape 
              tournament data from Chess-Results.com so you can discover events worldwide.
            </p>
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
                  Click "View on Chess-Results" on any tournament page to go to the original listing.
                </p>
              </div>

              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  Is TourneyRadar free?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  Yes, completely free and open source.
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
