"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { href: "/support", label: "Support" },
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

// Hand-rolled account dropdown (Wishlist / Sign out), shaped after Pepiros's
// header account menu. No Radix dependency — TR doesn't have one installed
// and this is the only place that would need it.
function AccountMenu() {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="nav-account-link"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <AccountIcon />
      </button>

      {open && (
        <div className="nav-account-menu">
          <Link href="/player/wishlist" onClick={() => setOpen(false)}>
            Wishlist
          </Link>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await logout();
              router.push("/");
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// Single nav bar shared by the homepage and every other page (via
// BaseLayout) so the site has one consistent nav, not two diverging ones.
//
// Three-zone layout (brand | links | utilities), shaped after Pepiros's
// SiteHeader: a plain flex row with justify-between across exactly three
// children, rather than lumping links and utilities into one group.
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
        </div>

        <div className="nav-utilities">
          <ThemeToggle />
          {loggedIn ? (
            <AccountMenu />
          ) : (
            !authLoading && (
              <div className="nav-auth-links">
                <Link href="/player/login" className="nav-btn-ghost">
                  Log In
                </Link>
                <Link href="/player/register" className="nav-btn-primary">
                  Sign Up
                </Link>
              </div>
            )
          )}
          <MobileMenuButton onClick={onMenuClick} />
        </div>
      </div>
    </nav>
  );
}
