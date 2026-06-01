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
              Last updated: June 2026
            </p>

            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>1. Information We Collect</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              When you create an account, we collect your email, name, and optionally your city and country. We also collect anonymous analytics data about page visits and feature interactions. No personally identifiable information is captured in analytics.
            </p>

            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>2. How We Use Your Information</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              We use your information to provide tournament recommendations and maintain your wishlist. Analytics data helps us understand which features are useful. We do not sell your data to third parties.
            </p>

            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>3. Analytics</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              We use <strong>Umami Analytics</strong>, a privacy-friendly, cookieless analytics tool. Umami collects no personally identifiable information and does not use cookies. Page view counts and anonymous interaction events (such as clicking "Star on GitHub") are recorded to help us improve the product.
            </p>

            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>4. Local Storage</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              We store a small number of anonymous flags in your browser's local storage to improve your experience — for example, remembering whether you have dismissed a prompt. These values contain no personal data, never leave your browser, and can be cleared at any time by clearing your browser's site data.
            </p>

            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>5. Data Storage</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              Account data is stored securely using Supabase, hosted on AWS infrastructure in the US.
            </p>

            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>6. Your Rights</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              You can delete your account at any time by contacting us. Upon deletion, all your personal data will be removed from our systems.
            </p>

            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>7. Contact</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              For privacy concerns, contact us at dhawansanay@gmail.com
            </p>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
