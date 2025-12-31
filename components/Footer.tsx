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
            Discover chess tournaments across India. Connect with organizers, track your registrations, and never miss a tournament.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "1rem" }}>
            Made with ❤️ for Indian Chess Community
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
            <Link href="/player/login" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              Player Login
            </Link>
            <Link href="/organizer/login" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              Organizer Login
            </Link>
            <Link href="/contact" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              Contact Us
            </Link>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem", fontSize: "1rem" }}>
            Legal
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href="/terms" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              Terms of Service
            </Link>
            <Link href="/privacy" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
              Privacy Policy
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
              {/* WhatsApp */}
              <a
                href="https://wa.me/918976191515?text=Hi%20TourneyRadar%20Team"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#25D366",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  textDecoration: "none"
                }}
                aria-label="WhatsApp"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
              {/* Email */}
              <a
                href="mailto:dhawansanay@gmail.com"
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
                href="#"
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
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
              +91 89761 91515
            </p>
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
