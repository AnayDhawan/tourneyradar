"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthContext";
import Footer from "./Footer";

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
  const { user, userType, loading: authLoading } = useAuth();

  useEffect(() => {
    // Apply saved theme or default to system
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  }, []);

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {showHero ? (
        <section className="hero-bg" style={{ minHeight: "40vh", display: "flex", flexDirection: "column" }}>
          <nav className="glass">
            <div className="nav-container">
              <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
                TourneyRadar
              </Link>

              <div className="nav-links">
                <Link href="/tournaments" style={{ textDecoration: "none", color: "inherit" }}>Tournaments</Link>
                {!authLoading && (
                  userType === "player" ? (
                    <Link href="/player/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                      My Dashboard
                    </Link>
                  ) : userType === "organizer" ? (
                    <Link href="/organizer/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                      Organizer Dashboard
                    </Link>
                  ) : userType === "admin" ? (
                    <Link href="/admin/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                      Admin Panel
                    </Link>
                  ) : (
                    <Link href="/player/login" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                      Player Login
                    </Link>
                  )
                )}
              </div>

              <button className="mobile-menu-btn" aria-label="Menu">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
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

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none", color: "inherit" }}>Tournaments</Link>
              {!authLoading && (
                userType === "player" ? (
                  <Link href="/player/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                    My Dashboard
                  </Link>
                ) : userType === "organizer" ? (
                  <Link href="/organizer/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                    Organizer Dashboard
                  </Link>
                ) : userType === "admin" ? (
                  <Link href="/admin/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                    Admin Panel
                  </Link>
                ) : (
                  <Link href="/player/login" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                    Player Login
                  </Link>
                )
              )}
            </div>

            <button className="mobile-menu-btn" aria-label="Menu">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </nav>
      )}

      <main style={{ flex: 1 }}>{children}</main>

      <Footer />
    </div>
  );
}
