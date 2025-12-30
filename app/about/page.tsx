"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext";
import Footer from "../../components/Footer";

export default function AboutPage() {
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
            About <span className="highlight">TourneyRadar</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "900px" }}>
          {/* Mission Section */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              🎯 Our Mission
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: "1rem" }}>
              <strong>Connecting chess players with tournaments across India.</strong>
            </p>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              TourneyRadar was created to make tournament discovery simple and accessible for every chess enthusiast in India. 
              Whether you're a beginner looking for your first rated tournament or an experienced player seeking FIDE-rated events, 
              we're here to help you find the perfect competition.
            </p>
          </div>

          {/* For Players Section */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
              ♟️ For Players
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
              <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--surface-elevated)", borderRadius: "12px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🆓</div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>Free Registration</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Create your account at no cost</p>
              </div>
              <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--surface-elevated)", borderRadius: "12px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🏆</div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>500+ Tournaments</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Browse events across India</p>
              </div>
              <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--surface-elevated)", borderRadius: "12px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📋</div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>Track Registrations</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Manage all your tournaments</p>
              </div>
              <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--surface-elevated)", borderRadius: "12px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>❤️</div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>Follow Organizers</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Never miss an event</p>
              </div>
            </div>
          </div>

          {/* For Organizers Section */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
              🎪 For Organizers
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
              <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--surface-elevated)", borderRadius: "12px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👥</div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>Reach Thousands</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Connect with players across India</p>
              </div>
              <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--surface-elevated)", borderRadius: "12px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚙️</div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>Easy Management</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Simple tournament dashboard</p>
              </div>
              <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--surface-elevated)", borderRadius: "12px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📊</div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>Analytics & Insights</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Track views and engagement</p>
              </div>
              <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--surface-elevated)", borderRadius: "12px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💬</div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>Contact Us</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Get started today</p>
              </div>
            </div>
            <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
              <a
                href="https://wa.me/918976191515?text=Hi,%20I%20want%20to%20become%20an%20organizer%20on%20TourneyRadar"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                Contact Us to Get Started →
              </a>
            </div>
          </div>

          {/* Why TourneyRadar Section */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
              ✨ Why TourneyRadar?
            </h2>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ fontSize: "1.5rem" }}>📚</div>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-primary)" }}>Comprehensive Database</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>The largest collection of chess tournaments in India, updated daily.</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ fontSize: "1.5rem" }}>🎨</div>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-primary)" }}>Easy to Use</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Beautiful, intuitive interface designed for chess players.</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ fontSize: "1.5rem" }}>⚡</div>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-primary)" }}>Real-time Updates</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Get the latest tournament information as soon as it's available.</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ fontSize: "1.5rem" }}>🤝</div>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-primary)" }}>Trusted by 100+ Organizers</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Join the growing community of chess organizers across India.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
