"use client";

import Link from "next/link";
import MobileMenuButton from "@/components/MobileMenuButton";
import ThemeToggle from "@/components/ThemeToggle";

interface SiteNavProps {
  onMenuClick: () => void;
}

// Single nav bar shared by the homepage and every other page (via
// BaseLayout) so the site has one consistent nav, not two diverging ones.
export default function SiteNav({ onMenuClick }: SiteNavProps) {
  return (
    <nav className="home-nav">
      <div className="nav-container">
        <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
          TourneyRadar
        </Link>

        <div className="nav-links">
          <Link href="/tournaments">Tournaments</Link>
          <Link href="/about">About</Link>
          <Link href="/support">Support Us</Link>
          <ThemeToggle variant="hero" />
        </div>

        <MobileMenuButton onClick={onMenuClick} />
      </div>
    </nav>
  );
}
