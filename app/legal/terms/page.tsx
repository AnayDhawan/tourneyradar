"use client";

import BaseLayout from "../../../components/BaseLayout";

export default function TermsPage() {
  return (
    <BaseLayout 
      showHero={true} 
      heroTitle={<>Terms of <span className="highlight">Service</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "800px" }}>
          <div className="card">
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Last updated: January 2025
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>1. Service Description</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              TourneyRadar is a free tournament discovery platform that aggregates chess tournament information from public sources. We do not organize tournaments or handle registrations.
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>2. Data Sources</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              Tournament information is collected from publicly available sources including Chess-Results.com, FIDE Calendar, AICF, and other chess federation websites. We make reasonable efforts to ensure accuracy but cannot guarantee all information is up-to-date.
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>3. User Accounts</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              You may create a free account to save tournaments to your wishlist. You are responsible for maintaining the security of your account.
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>4. Limitation of Liability</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              TourneyRadar is provided "as is" without warranties. We are not responsible for any inaccuracies in tournament information or any issues arising from your use of external tournament websites.
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>5. Contact</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              For questions, contact us at help@tourneyradar.com
            </p>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
