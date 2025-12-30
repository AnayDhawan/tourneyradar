"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext";
import Footer from "../../components/Footer";

export default function PrivacyPage() {
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
              Privacy <span className="highlight">Policy</span>
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
                1. Information We Collect
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                We collect information you provide directly to us:
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}><strong>Account Information:</strong> Name, email address, phone number, FIDE ID (optional)</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Profile Information:</strong> Chess rating, preferred categories, location</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Tournament Data:</strong> Registrations, favorites, viewing history</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Organizer Information:</strong> Organization name, contact details, tournament listings</li>
              </ul>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                2. How We Use Your Information
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                We use the information we collect to:
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>Provide and maintain our services</li>
                <li style={{ marginBottom: "0.5rem" }}>Show you relevant tournaments based on your preferences</li>
                <li style={{ marginBottom: "0.5rem" }}>Process tournament registrations</li>
                <li style={{ marginBottom: "0.5rem" }}>Send important updates about tournaments you've registered for</li>
                <li style={{ marginBottom: "0.5rem" }}>Provide analytics to tournament organizers</li>
                <li style={{ marginBottom: "0.5rem" }}>Improve our platform and develop new features</li>
                <li style={{ marginBottom: "0.5rem" }}>Respond to your inquiries and support requests</li>
              </ul>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                3. Information Sharing
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                We may share your information in the following circumstances:
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}><strong>With Organizers:</strong> When you register for a tournament, your registration details are shared with the organizer</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Service Providers:</strong> We use Supabase for database and authentication services</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
              <p style={{ marginBottom: "1.5rem" }}>
                We do not sell your personal information to third parties.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                4. Third-Party Services
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                We use the following third-party services:
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}><strong>Supabase:</strong> Database hosting and user authentication</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Vercel:</strong> Website hosting and analytics</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Google Maps:</strong> Location services for tournament venues</li>
              </ul>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                5. Your Rights
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                You have the right to:
              </p>
              <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
                <li style={{ marginBottom: "0.5rem" }}><strong>Access:</strong> Request a copy of your personal data</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Portability:</strong> Receive your data in a portable format</li>
                <li style={{ marginBottom: "0.5rem" }}><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
              <p style={{ marginBottom: "1.5rem" }}>
                To exercise these rights, contact us at dhawansanay@gmail.com.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                6. Cookies and Tracking
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                We use essential cookies to maintain your session and preferences (such as theme selection). We also collect anonymous analytics data to understand how users interact with our platform. You can disable cookies in your browser settings, but this may affect functionality.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                7. Data Security
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                We implement appropriate security measures to protect your personal information. This includes encryption of data in transit and at rest, secure authentication, and regular security audits. However, no method of transmission over the Internet is 100% secure.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                8. Data Retention
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                We retain your personal information for as long as your account is active or as needed to provide services. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal purposes.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                9. Children's Privacy
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                Our services are intended for users of all ages. For users under 18, we recommend parental supervision. We do not knowingly collect personal information from children under 13 without parental consent.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                10. Changes to This Policy
              </h2>
              <p style={{ marginBottom: "1.5rem" }}>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
              </p>

              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                11. Contact Us
              </h2>
              <p style={{ marginBottom: "1rem" }}>
                If you have questions about this Privacy Policy or our data practices, please contact us:
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
