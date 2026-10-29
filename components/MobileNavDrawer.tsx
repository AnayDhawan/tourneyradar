"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  userType: "player" | "admin" | null;
  showThemeToggle?: boolean;
}

const CLOSE_ANIMATION_MS = 250;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function MobileNavDrawer({ open, onClose, userType, showThemeToggle = false }: MobileNavDrawerProps) {
  const loggedIn = userType === "player";
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Adjust state during render in response to the `open` prop changing
  // (React-sanctioned pattern: https://react.dev/learn/you-might-not-need-an-effect)
  // rather than in a useEffect, so the exit animation can play before unmount.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
    }
  }

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [closing]);

  // While open the drawer behaves as a modal dialog: it locks page scroll, takes focus,
  // keeps Tab inside the panel, closes on Escape and hands focus back to whatever opened it.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panelRef.current?.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [open]);

  if (!rendered) return null;

  return (
    <div className={`mobile-overlay${closing ? " closing" : ""}`} onClick={onClose}>
      <div
        id="mobile-nav-drawer"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className={`mobile-drawer${closing ? " closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-drawer-header">
          <span className="mobile-drawer-brand font-display">TourneyRadar</span>
          <button ref={closeRef} className="mobile-drawer-close" onClick={onClose} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="mobile-drawer-nav">
          <Link href="/tournaments" onClick={onClose}>
            Tournaments
          </Link>
          <Link href="/docs" onClick={onClose}>
            Docs
          </Link>
          <Link href="/updates" onClick={onClose}>
            Updates
          </Link>
          <Link href="/about" onClick={onClose}>
            About
          </Link>
          <Link href="/support" onClick={onClose}>
            Support
          </Link>
          <Link href="/api-docs" onClick={onClose}>
            API Docs
          </Link>
          {!loggedIn && (
            <>
              <Link href="/player/login" onClick={onClose}>
                Log In
              </Link>
              <Link href="/player/register" className="mobile-drawer-cta" onClick={onClose}>
                Sign Up
              </Link>
            </>
          )}
          {showThemeToggle && (
            <div className="mobile-drawer-theme">
              <span className="mobile-drawer-theme-label">Theme</span>
              <ThemeToggle />
            </div>
          )}
          {loggedIn && (
            <Link href="/player/wishlist" className="mobile-drawer-account" onClick={onClose}>
              <AccountIcon />
              My Account
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
