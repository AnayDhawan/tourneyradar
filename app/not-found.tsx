"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/tournaments?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav className="glass" style={{ background: "var(--primary)" }}>
        <div className="nav-container">
          <Link href="/" className="nav-brand font-display">
            TourneyRadar
          </Link>
          <div className="nav-links">
            <Link href="/tournaments">Tournaments</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: "600px" }}>
          {/* Chess piece icon */}
          <div style={{ fontSize: "6rem", marginBottom: "1.5rem", opacity: 0.8 }}>
            ♞
          </div>

          <h1 className="font-display" style={{ 
            fontSize: "3rem", 
            fontWeight: 800, 
            color: "var(--text-primary)", 
            marginBottom: "1rem" 
          }}>
            Page Not Found
          </h1>

          <p style={{ 
            color: "var(--text-secondary)", 
            fontSize: "1.125rem", 
            marginBottom: "2rem",
            lineHeight: 1.6
          }}>
            Oops! The page you're looking for doesn't exist. It might have been moved or deleted, 
            or you may have mistyped the URL.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", maxWidth: "400px", margin: "0 auto" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search for tournaments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </div>
          </form>

          {/* Quick links */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link 
              href="/" 
              className="btn btn-primary"
              style={{ textDecoration: "none" }}
            >
              ← Back to Home
            </Link>
            <Link 
              href="/tournaments" 
              className="btn"
              style={{ 
                textDecoration: "none",
                background: "var(--surface-elevated)",
                border: "2px solid var(--border)",
                color: "var(--text-primary)"
              }}
            >
              Browse Tournaments
            </Link>
          </div>

          {/* Help text */}
          <p style={{ 
            color: "var(--text-muted)", 
            fontSize: "0.875rem", 
            marginTop: "3rem" 
          }}>
            Need help? <Link href="/contact" style={{ color: "var(--primary)" }}>Contact us</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
