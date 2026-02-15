"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";

export default function Footer() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", newTheme);
    }
    localStorage.setItem('theme', newTheme);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <footer style={{
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      padding: "3rem 1rem",
      marginTop: "auto"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "2rem"
      }}>
        {/* Logo & Tagline */}
        <div>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "right", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <h3 className="font-display" style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--primary)",
              margin: 0,
              textAlign: "center"
            }}>
              TourneyRadar
            </h3>            
          </Link>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
            Discover chess tournaments worldwide. The free, open-source global chess tournament aggregator.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "1rem" }}>
            Free & Open Source
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem", fontSize: "1rem" }}>
            Quick Links
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href="/tournaments" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              Browse Tournaments
            </Link>
            <Link href="/tournaments/completed" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              Completed Tournaments
            </Link>
            <Link href="/about" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              About
            </Link>
            <Link href="/contact" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              Contact
            </Link>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem", fontSize: "1rem" }}>
            Legal
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href="/legal" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              Legal & Privacy
            </Link>
          </div>
        </div>

        {/* Theme Toggle & Contact */}
        <div>
          <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem", fontSize: "1rem" }}>
            Theme
          </h4>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => handleThemeChange('light')}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                borderRadius: "8px",
                border: "2px solid var(--border)",
                background: theme === 'light' ? 'var(--primary)' : 'var(--surface-elevated)',
                color: theme === 'light' ? 'white' : 'var(--text-primary)',
                cursor: "pointer",
                fontWeight: theme === 'light' ? 600 : 400,
                transition: "all 0.2s"
              }}
            >
              Light
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                borderRadius: "8px",
                border: "2px solid var(--border)",
                background: theme === 'dark' ? 'var(--primary)' : 'var(--surface-elevated)',
                color: theme === 'dark' ? 'white' : 'var(--text-primary)',
                cursor: "pointer",
                fontWeight: theme === 'dark' ? 600 : 400,
                transition: "all 0.2s"
              }}
            >
              Dark
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                borderRadius: "8px",
                border: "2px solid var(--border)",
                background: theme === 'system' ? 'var(--primary)' : 'var(--surface-elevated)',
                color: theme === 'system' ? 'white' : 'var(--text-primary)',
                cursor: "pointer",
                fontWeight: theme === 'system' ? 600 : 400,
                transition: "all 0.2s"
              }}
            >
              System
            </button>
          </div>
        
          <div>
            <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem", fontSize: "1rem" }}>
              Connect With Us
            </h4>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              {/* Email */}
              <a
                href="mailto:help@tourneyradar.com"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  textDecoration: "none"
                }}
                aria-label="Email"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </a>
              {/* Instagram placeholder */}
              <a
                href="https://www.instagram.com/tourneyradar/"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  textDecoration: "none"
                }}
                aria-label="Instagram"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              {/* GitHub */}
              <a
                href="https://github.com/AnayDhawan/tourneyradar"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#333",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  textDecoration: "none"
                }}
                aria-label="GitHub"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>      
      </div>
          
      {/* Copyright */}
      <div style={{
        maxWidth: "1200px",
        margin: "2rem auto 0",
        paddingTop: "2rem",
        borderTop: "1px solid var(--border)",
        textAlign: "center"
      }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
          © 2025 TourneyRadar. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
