"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext";
import Footer from "../../components/Footer";

export default function TermsPage() {
  const { userType, loading: authLoading } = useAuth();

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-bg" style={{ minHeight: "30vh", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display">
              TourneyRadar
            </Link>
            <div className="nav-links">
              <Link href="/tournaments">Tournaments</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              {!authLoading && (
                userType === "player" ? (
                  <Link href="/player/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>My Dashboard</Link>
                ) : userType === "organizer" ? (
                  <Link href="/organizer/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Organizer Dashboard</Link>
                ) : userType === "admin" ? (
                  <Link href="/admin/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Admin Panel</Link>
                ) : (
                  <Link href="/player/login" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Player Login</Link>
                )
              )}
            </div>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ textAlign: "center", maxWidth: "800px" }}>
            <h1 className="hero-title font-display" style={{ marginBottom: "1rem" }}>
              Terms of <span className="highlight">Service</span>
            </h1>
            <p className="hero-description" style={{ margin: "0 auto" }}>
              Last updated: December 2025
            </p>
          </div>
        </div>
      </section>

      <section style={{ padding: "4rem 1rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                1. Acceptance of Terms
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                By accessing and using TourneyRadar ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. These terms apply to all users, including players, tournament organizers, and visitors.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                2. User Accounts
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                To access certain features, you must create an account. You agree to:
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>Provide accurate and complete information</li>
                <li style={{ marginBottom: "0.5rem" }}>Maintain the security of your account credentials</li>
                <li style={{ marginBottom: "0.5rem" }}>Notify us immediately of any unauthorized access</li>
                <li style={{ marginBottom: "0.5rem" }}>Be responsible for all activities under your account</li>
              </ul>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                3. Tournament Listings
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                <strong>For Organizers:</strong>
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>You must have proper authorization to organize the tournament</li>
                <li style={{ marginBottom: "0.5rem" }}>All tournament information must be accurate and up-to-date</li>
                <li style={{ marginBottom: "0.5rem" }}>You are responsible for managing registrations and conducting the event</li>
                <li style={{ marginBottom: "0.5rem" }}>FIDE-rated tournaments must have valid FIDE approval</li>
              </ul>
              <p style={{ marginBottom: "1.5rem" }}>
                <strong>For Players:</strong> Tournament details are provided by organizers. TourneyRadar is not responsible for tournament cancellations, changes, or disputes between players and organizers.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                4. Payment & Refunds
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                TourneyRadar offers subscription plans for organizers. Payment terms:
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>Subscription fees are billed monthly or annually as selected</li>
                <li style={{ marginBottom: "0.5rem" }}>Refunds may be requested within 7 days of purchase for unused services</li>
                <li style={{ marginBottom: "0.5rem" }}>Tournament entry fees are handled directly by organizers, not TourneyRadar</li>
                <li style={{ marginBottom: "0.5rem" }}>We reserve the right to modify pricing with 30 days notice</li>
              </ul>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                5. User Content
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                You retain ownership of content you submit. By posting content, you grant TourneyRadar a non-exclusive license to display, distribute, and promote your content on the platform. You agree not to post content that is illegal, offensive, or infringes on others' rights.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                6. Prohibited Activities
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                You agree not to:
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>Create fake tournaments or misleading listings</li>
                <li style={{ marginBottom: "0.5rem" }}>Harass other users or organizers</li>
                <li style={{ marginBottom: "0.5rem" }}>Attempt to access others' accounts without permission</li>
                <li style={{ marginBottom: "0.5rem" }}>Use automated systems to scrape or collect data</li>
                <li style={{ marginBottom: "0.5rem" }}>Violate any applicable laws or regulations</li>
              </ul>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                7. Termination
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                We may suspend or terminate your account if you violate these terms. You may also delete your account at any time by contacting us. Upon termination, your right to use the platform ceases immediately.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                8. Disclaimers
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                TourneyRadar is provided "as is" without warranties of any kind. We do not guarantee the accuracy of tournament information, the conduct of organizers, or uninterrupted service. We are not liable for any damages arising from your use of the platform.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                9. Governing Law
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                These terms are governed by the laws of India. Any disputes shall be resolved in the courts of Mumbai, Maharashtra.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                10. Contact Information
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                For questions about these Terms of Service, please contact us:
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>Email: dhawansanay@gmail.com</li>
                <li style={{ marginBottom: "0.5rem" }}>WhatsApp: +91 89761 91515</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
