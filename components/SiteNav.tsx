"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MobileMenuButton from "@/components/MobileMenuButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";

interface SiteNavProps {
  onMenuClick: () => void;
}

const NAV_LINKS = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/docs", label: "Docs" },
  { href: "/updates", label: "Updates" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support Us" },
  { href: "/api-docs", label: "API Docs" },
];

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Single nav bar shared by the homepage and every other page (via
// BaseLayout) so the site has one consistent nav, not two diverging ones.
export default function SiteNav({ onMenuClick }: SiteNavProps) {
  const { userType, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const loggedIn = !authLoading && userType === "player";

  return (
    <nav className="home-nav">
      <div className="nav-container">
        <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
          TourneyRadar
        </Link>

        <div className="nav-links">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={active ? "active" : undefined}>
                {link.label}
              </Link>
            );
          })}
          <ThemeToggle variant="hero" />
          {loggedIn && (
            <Link href="/player/wishlist" className="nav-account-link" aria-label="My account" title="My account">
              <AccountIcon />
            </Link>
          )}
        </div>

        <MobileMenuButton onClick={onMenuClick} />
      </div>
    </nav>
  );
}
