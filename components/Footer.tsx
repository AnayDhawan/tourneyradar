"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/track";
import DataFreshness from "./DataFreshness";

// Shape borrowed from Pepiros's SiteFooter: a brand block with a CTA, four
// link columns under small uppercase headings, then a bottom bar carrying
// copyright, inline legal links, and social marks.
const EXPLORE_LINKS = [
  { href: "/tournaments", label: "Browse Tournaments" },
  { href: "/docs", label: "Docs" },
  { href: "/updates", label: "Updates" },
  { href: "/api-docs", label: "API Docs" },
];

const ACCOUNT_LINKS = [
  { href: "/player/wishlist", label: "Wishlist" },
  { href: "/player/register", label: "Sign Up" },
  { href: "/player/login", label: "Log In" },
];

const PROJECT_LINKS = [
  { href: "/about", label: "About" },
  { href: "/support", label: "Support Us" },
  { href: "/contact", label: "Contact" },
  { href: "/feedback", label: "Feedback" },
];

const LEGAL_LINKS = [
  { href: "/legal", label: "Legal & Privacy" },
  { href: "/stats", label: "Site Analytics" },
];

const BOTTOM_LINKS = [
  { href: "/legal", label: "Legal" },
  { href: "/stats", label: "Status" },
  { href: "/contact", label: "Contact" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="footer-kicker">{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer style={{
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      marginTop: "auto"
    }}>
      <div className="footer-grid" style={{ maxWidth: "1200px", margin: "0 auto", padding: "4rem 1.5rem" }}>
        {/* Brand + CTA */}
        <div>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <h3 className="font-display" style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--primary)",
              margin: 0,
            }}>
              TourneyRadar
            </h3>
          </Link>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6, maxWidth: "20rem" }}>
            Discover chess tournaments worldwide. The free, open-source global chess tournament aggregator.
          </p>
          <Link
            href="/tournaments"
            className="btn btn-primary"
            style={{ display: "inline-block", marginTop: "1rem", padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
          >
            Explore Tournaments
          </Link>
          <div style={{ marginTop: "0.875rem" }}>
            <a
              href="https://github.com/AnayDhawan/tourneyradar"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("star_link", { src: "footer_text" })}
              style={{ color: "var(--primary)", fontSize: "0.8125rem", fontWeight: 700, textDecoration: "none" }}
            >
              ⭐ Star on GitHub
            </a>
          </div>
        </div>

        <FooterColumn title="Explore" links={EXPLORE_LINKS} />
        <FooterColumn title="Account" links={ACCOUNT_LINKS} />
        <FooterColumn title="Project" links={PROJECT_LINKS} />
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>

      {/* Bottom bar: copyright + legal links, socials */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div
          className="footer-bottom-bar"
          style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.75rem 1.5rem" }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem 1rem", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            <span>© {new Date().getFullYear()} TourneyRadar</span>
            {BOTTOM_LINKS.map((link) => (
              <Link key={link.href} href={link.href} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
                {link.label}
              </Link>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <a
              href="mailto:dhawansanay@gmail.com"
              style={{
                width: "36px",
                height: "36px",
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </a>
            <a
              href="https://wa.me/919326503299"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: "36px",
                height: "36px",
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
            <a
              href="https://github.com/AnayDhawan/tourneyradar"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("star_link", { src: "footer" })}
              style={{
                width: "36px",
                height: "36px",
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>

        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem 1.5rem", textAlign: "center" }}>
          <DataFreshness />
        </div>
      </div>
    </footer>
  );
}
