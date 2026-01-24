"use client";

import BaseLayout from "@/components/BaseLayout";

export default function AboutPage() {
  return (
    <BaseLayout 
      showHero={true} 
      heroTitle={<>About <span className="highlight">TourneyRadar</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "800px" }}>
          
          {/* Mission */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              Our Mission
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              TourneyRadar is a free, open-source platform that helps chess players discover 
              over-the-board tournaments happening around the world. We aggregate tournament 
              data from Chess-Results.com so you can find events in one place.
            </p>
          </div>

          {/* How It Works */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              How It Works
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: "1rem" }}>
              Our automated scraper collects tournament information from Chess-Results.com, 
              focusing on events that have official websites or documentation. Each tournament 
              is geocoded and displayed on an interactive map.
            </p>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              We only display upcoming tournaments with verified external links, ensuring 
              you see legitimate, well-organized events.
            </p>
          </div>

          {/* Data Source */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              Data Source
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              All tournament data is sourced from <strong>Chess-Results.com</strong>, one of the 
              largest databases of chess tournament results and upcoming events worldwide.
            </p>
          </div>

          {/* Open Source */}
          <div className="card" style={{ marginBottom: "2rem", background: "linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)", color: "white" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
              Open Source
            </h2>
            <p style={{ marginBottom: "1rem", opacity: 0.9, lineHeight: 1.8 }}>
              TourneyRadar is completely free and open source. The entire codebase is 
              available on GitHub.
            </p>
            <a 
              href="https://github.com/AnayDhawan/tourneyradar" 
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ 
                background: "rgba(255,255,255,0.2)", 
                border: "2px solid rgba(255,255,255,0.5)",
                color: "white",
                textDecoration: "none"
              }}
            >
              View on GitHub
            </a>
          </div>

          {/* Disclaimer */}
          <div className="card">
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              Disclaimer
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              TourneyRadar does not organize tournaments. We aggregate publicly available 
              information to help players discover events. For registration and official 
              details, always refer to the original source (Chess-Results or the tournament's 
              official website).
            </p>
          </div>

        </div>
      </section>
    </BaseLayout>
  );
}
