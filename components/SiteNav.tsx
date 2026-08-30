"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MobileMenuButton from "@/components/MobileMenuButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";

interface SiteNavProps {
  onMenuClick: () => void;
}

interface DropdownItem {
  href: string;
  label: string;
  description: string;
}

// Tournaments is a plain link; Docs and About are dropdowns. Shaped after
// Pepiros's NavMenu (trigger + panel of described links) but hand-rolled,
// single-column since neither list is long enough to need Product/Resources
// style multi-section panels.
const DOCS_MENU: DropdownItem[] = [
  { href: "/docs", label: "All Docs", description: "Every guide in one place." },
  {
    href: "/docs/fide-tournament-registration",
    label: "FIDE Registration",
    description: "How to register for a FIDE-rated tournament.",
  },
  {
    href: "/docs/for-tournament-organizers",
    label: "For Organizers",
    description: "Get your tournament listed on TR.",
  },
  { href: "/docs/new", label: "Write a Doc", description: "Share a guide with other players." },
];

const ABOUT_MENU: DropdownItem[] = [
  { href: "/about", label: "About", description: "What TourneyRadar is and how it works." },
  { href: "/support", label: "Support", description: "Support the project." },
  { href: "/updates", label: "Updates", description: "What shipped, and when." },
  { href: "/api-docs", label: "API", description: "The free public tournament data API." },
];

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NavDropdown({ label, items }: { label: string; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const pathname = usePathname();
  const active = items.some((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`));

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

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={rootRef} className="nav-dropdown-root" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={active ? "active" : undefined}
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginLeft: 2 }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div id={panelId} className="nav-dropdown-panel">
          {items.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              <span className="nav-dropdown-item-label">{item.label}</span>
              <span className="nav-dropdown-item-desc">{item.description}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
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
          <Link
            href="/tournaments"
            className={pathname === "/tournaments" || pathname?.startsWith("/tournaments/") ? "active" : undefined}
          >
            Tournaments
          </Link>
          <NavDropdown label="Docs" items={DOCS_MENU} />
          <NavDropdown label="About" items={ABOUT_MENU} />
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
