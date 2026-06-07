"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthContext";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import ThemeToggle from "./ThemeToggle";
import { useThemePreference } from "@/lib/theme";
interface BaseLayoutProps {
  children: React.ReactNode;
  showHero?: boolean;
  heroTitle?: React.ReactNode;
  heroDescription?: string;
}

export default function BaseLayout({
  children,
  showHero = false,
  heroTitle = "",
  heroDescription = ""
}: BaseLayoutProps) {
  const { userType, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useThemePreference();

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const getDashboardLink = () => {
    if (userType === "player") return { href: "/player/wishlist", label: "My Wishlist" };
    return { href: "/player/login", label: "Login" };
  };
  const dashboard = getDashboardLink();
  const isHeroNav = showHero;

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ========== MOBILE MENU OVERLAY ========== */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-brand font-display">TourneyRadar</span>
              <ThemeToggle />
              <button
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              <Link href="/tournaments" onClick={() => setMobileMenuOpen(false)}>
                Tournaments
              </Link>
              {!authLoading && (
                <Link
                  href={dashboard.href}
                  className="mobile-drawer-cta"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {dashboard.label}
                </Link>
              )}
              <ThemeToggle />

            </nav>
          </div>
        </div>
      )}

      {showHero ? (
        <section className="hero-bg" style={{ minHeight: "40vh", display: "flex", flexDirection: "column" }}>
          <nav className="glass">
            <div className="nav-container">
              <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
                TourneyRadar
              </Link>

              <div className="nav-links">
                <Link href="/tournaments" style={{ textDecoration: "none", color: "inherit" }}>
                  Tournaments
                </Link>
                {!authLoading && (
                  <Link href={dashboard.href} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                    {dashboard.label}
                  </Link>
                )}
                <ThemeToggle variant="hero" />
              </div>

              <button
                className="mobile-menu-btn"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </nav>

          {heroTitle && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
              <div style={{ textAlign: "center", maxWidth: "800px" }}>
                <h1 className="hero-title font-display" style={{ marginBottom: "1rem" }}>
                  {heroTitle}
                </h1>
                {heroDescription && (
                  <p className="hero-description" style={{ margin: "0 auto" }}>
                    {heroDescription}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      ) : (
        <nav className="glass" style={{ position: "sticky", top: 0, zIndex: 100 }}>
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>
            <ThemeToggle />

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none", color: "inherit" }}>Tournaments</Link>
              {!authLoading && (
                <Link href={dashboard.href} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                  {dashboard.label}
                </Link>
              )}
            </div>

          </div>
        </nav>
      )}

      <main style={{ flex: 1 }}>{children}</main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
