"use client";

import BaseLayout from "@/components/BaseLayout";

export default function PrivacyPage() {
  return (
    <BaseLayout 
      showHero={true} 
      heroTitle={<>Privacy <span className="highlight">Policy</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "800px" }}>
          <div className="card">
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Last updated: January 2025
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>1. Information We Collect</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              When you create an account, we collect your email, name, and optionally your city and country. We also collect basic analytics data about page visits.
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>2. How We Use Your Information</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              We use your information to provide personalized tournament recommendations and maintain your wishlist. We do not sell your data to third parties.
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>3. Data Storage</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              Your data is stored securely using Supabase. We use Firebase Analytics for anonymous usage statistics.
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>4. Your Rights</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              You can delete your account at any time by contacting us. Upon deletion, all your personal data will be removed from our systems.
            </p>
            
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>5. Contact</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              For privacy concerns, contact us at help@tourneyradar.com
            </p>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
