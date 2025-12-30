"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext";
import Footer from "../../components/Footer";

export default function ContactPage() {
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
      <section className="hero-bg" style={{ minHeight: "40vh", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none" }}>Tournaments</Link>
              {!authLoading && (
                userType === "player" ? (
                  <Link href="/player/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>My Dashboard</Link>
                ) : userType === "organizer" ? (
                  <Link href="/organizer/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>Organizer Dashboard</Link>
                ) : (
                  <Link href="/player/login" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>Player Login</Link>
                )
              )}
            </div>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Get in <span className="highlight">Touch</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "800px" }}>
          {/* Contact Options */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💬</div>
              <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-primary)" }}>
                WhatsApp
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.9375rem" }}>
                Quick responses, usually within hours
              </p>
              <a
                href="https://wa.me/918976191515"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: "none", background: "#25D366" }}
              >
                Chat on WhatsApp
              </a>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
              <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-primary)" }}>
                Email
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.9375rem" }}>
                For detailed inquiries
              </p>
              <a
                href="mailto:dhawansanay@gmail.com"
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                Send Email
              </a>
            </div>
          </div>

          {/* For Organizers */}
          <div className="card" style={{ marginBottom: "2rem", background: "linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)", color: "white" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
              🎪 For Organizers
            </h2>
            <p style={{ marginBottom: "1.5rem", opacity: 0.9 }}>
              Want to list your tournaments on TourneyRadar? We offer flexible plans for organizers of all sizes. 
              Contact us to discuss pricing and get started.
            </p>
            <a
              href="https://wa.me/918976191515?text=Hi,%20I%20want%20to%20become%20an%20organizer%20on%20TourneyRadar"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ background: "white", color: "var(--primary)", textDecoration: "none", fontWeight: 700 }}
            >
              Become an Organizer →
            </a>
          </div>

          {/* For Players */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              ♟️ For Players
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Have questions about tournaments, registration, or your account? We're here to help!
            </p>
            <p style={{ color: "var(--text-secondary)" }}>
              Reach out anytime via WhatsApp or email. We typically respond within 24 hours.
            </p>
          </div>

          {/* Business Hours */}
          <div className="card" style={{ marginBottom: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🕐</div>
            <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-primary)" }}>
              Business Hours
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
              <strong>Monday - Saturday:</strong> 9:00 AM - 9:00 PM IST
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
              <strong>Sunday:</strong> 10:00 AM - 6:00 PM IST
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.75rem" }}>
              WhatsApp messages are usually responded to within a few hours
            </p>
          </div>

          {/* FAQ Section */}
          <div className="card">
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
              ❓ Frequently Asked Questions
            </h2>

            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  How do I register for a tournament?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  Create a free player account, browse tournaments, and click "Register" on any tournament page. 
                  You'll be directed to the organizer's registration form.
                </p>
              </div>

              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  How can I list my tournament?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  Contact us via WhatsApp to become an organizer. We'll set up your account and you can start 
                  listing tournaments immediately.
                </p>
              </div>

              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  Is registration free for players?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  Yes! Creating a player account on TourneyRadar is completely free. Individual tournament 
                  entry fees are set by the organizers.
                </p>
              </div>

              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  How do I contact an organizer?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  Each tournament page shows the organizer's contact details. You can call, email, or join their 
                  WhatsApp group directly from the tournament page.
                </p>
              </div>

              <div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  What are the organizer pricing plans?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                  We offer Free (2 tournaments), Basic (10 tournaments), Pro (unlimited), and Enterprise 
                  (unlimited + priority support) plans. Contact us for details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
