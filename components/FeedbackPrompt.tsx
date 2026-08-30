"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/track";
import FeedbackForm from "@/components/FeedbackForm";

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // re-ask 7 days after "maybe later"
const FIRST_VISIT_DELAY = 20000; // first-time visitor: give them time to get value
const RETURN_VISIT_DELAY = 8000; // returning visitor (warm lead): ask sooner
const SCROLL_THRESHOLD = 0.5; // fire once half the page has been scrolled

// Pages where a feedback nudge would be noise (auth flows, legal text).
const EXCLUDED_PREFIXES = ["/player", "/legal", "/feedback"];

// Full-screen feedback modal. Collects the rating/comment inline (via the
// shared FeedbackForm, same one /feedback and About use) rather than routing
// away, since a full-screen takeover is the moment to ask, not a detour.
export default function FeedbackPrompt() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const firedRef = useRef(false);
  const visitsRef = useRef(1);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Count visits client-side. Umami is cookieless and can't tell new vs
  // returning visitors, so we keep a per-browser counter in localStorage and
  // increment it once per session.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem("tr_visit_counted")) {
        const n = parseInt(localStorage.getItem("tr_visits") || "0", 10) + 1;
        localStorage.setItem("tr_visits", String(n));
        sessionStorage.setItem("tr_visit_counted", "1");
        visitsRef.current = n;
      } else {
        visitsRef.current = parseInt(localStorage.getItem("tr_visits") || "1", 10);
      }
    } catch {
      /* storage unavailable, treat as first visit */
    }
  }, []);

  // Trigger logic: time + scroll + engagement, tiered by visit count.
  useEffect(() => {
    if (firedRef.current) return;
    if (EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))) return;

    let dismissed = false;
    let snoozed = false;
    let shownThisSession = false;
    try {
      dismissed = localStorage.getItem("tr_feedback_ok") === "1";
      const snoozeTs = parseInt(localStorage.getItem("tr_feedback_snooze") || "0", 10);
      snoozed = snoozeTs > 0 && Date.now() - snoozeTs < SNOOZE_MS;
      shownThisSession = sessionStorage.getItem("tr_feedback_shown") === "1";
    } catch {
      /* storage unavailable */
    }
    if (dismissed || snoozed || shownThisSession) return;

    let timer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("tr:engaged", onEngaged);
    };

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      try {
        sessionStorage.setItem("tr_feedback_shown", "1");
      } catch {
        /* ignore */
      }
      trackEvent("feedback_popup_shown", { page: pathname, visits: visitsRef.current });
      setShow(true);
      cleanup();
    };

    function onScroll() {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (total > 0 && scrolled / total >= SCROLL_THRESHOLD) fire();
    }
    function onEngaged() {
      fire();
    }

    const delay = visitsRef.current >= 2 ? RETURN_VISIT_DELAY : FIRST_VISIT_DELAY;
    timer = setTimeout(fire, delay);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("tr:engaged", onEngaged);

    return cleanup;
  }, [pathname]);

  // Focus management, Esc to dismiss, and lock page scroll while the
  // full-screen modal is open.
  useEffect(() => {
    if (!show) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleLater();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const handleLater = useCallback(() => {
    trackEvent("feedback_maybe_later");
    try {
      localStorage.setItem("tr_feedback_snooze", String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  }, []);

  const handleNever = useCallback(() => {
    trackEvent("feedback_never_again");
    try {
      localStorage.setItem("tr_feedback_ok", "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rate your TourneyRadar experience"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        overflowY: "auto",
      }}
    >
      <button
        ref={closeBtnRef}
        onClick={handleLater}
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-secondary)",
          fontSize: 28,
          lineHeight: 1,
        }}
        aria-label="Close"
      >
        ×
      </button>

      <div className="feedback-card" style={{ margin: "auto" }}>
        <FeedbackForm
          fromPage={pathname || "/"}
          title="Rate TourneyRadar experience"
          subtitle="How's it going so far? A quick rating helps a ton, a comment is optional."
          onSubmitted={() => {
            /* tr_feedback_ok is set inside FeedbackForm; leave the modal open
               so the thank-you state (with the GitHub star nudge) shows. */
          }}
        />

        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1.5rem" }}>
          <button
            type="button"
            onClick={handleLater}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={handleNever}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Don&apos;t show again
          </button>
        </div>
      </div>
    </div>
  );
}
