"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { trackEvent } from "@/lib/track";

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // re-ask 7 days after "maybe later"
const FIRST_VISIT_DELAY = 20000; // first-time visitor: give them time to get value
const RETURN_VISIT_DELAY = 8000; // returning visitor (warm lead): ask sooner
const SCROLL_THRESHOLD = 0.5; // fire once half the page has been scrolled
const MAX_RATING = 5;

// Pages where a feedback nudge would be noise (auth flows, legal text).
const EXCLUDED_PREFIXES = ["/player", "/legal"];

export default function FeedbackPrompt() {
  const pathname = usePathname();
  const { user, userType } = useAuth();
  const { showToast } = useToast();
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
  // Same mechanics as the old star prompt, fresh keys so users who dismissed
  // the star nudge still get asked once for feedback.
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

  // Focus management + Esc to dismiss when open.
  useEffect(() => {
    if (!show) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleLater();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const handleSubmit = useCallback(async () => {
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    try {
      const playerId = userType === "player" ? (user?.id ?? null) : null;
      const { error } = await supabase.from("feedback").insert({
        player_id: playerId,
        rating,
        comment: comment.trim() || null,
        page_url: pathname ?? "/",
      });
      if (error) throw error;
      trackEvent("feedback_submitted", { rating, page: pathname });
      posthog.capture("feedback_submitted", {
        rating,
        page: pathname,
      });
      try {
        localStorage.setItem("tr_feedback_ok", "1");
      } catch {
        /* ignore */
      }
      setShow(false);
      showToast("Thanks for your feedback!");
    } catch (err) {
      console.error("Feedback submit failed:", err);
      showToast("Couldn't send feedback. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [rating, submitting, comment, pathname, user, userType, showToast]);

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

  const displayed = hover || rating;

  return (
    <div
      role="dialog"
      aria-label="Rate TourneyRadar"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 900,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "1.25rem 1.5rem",
        width: "min(320px, calc(100vw - 2rem))",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        animation: "slideUp 0.3s ease",
      }}
    >
      <button
        ref={closeBtnRef}
        onClick={handleLater}
        style={{
          position: "absolute",
          top: "0.75rem",
          right: "0.75rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-secondary)",
          fontSize: 18,
          lineHeight: 1,
        }}
        aria-label="Close"
      >
        ×
      </button>
      <div style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
        How&apos;s TourneyRadar working for you?
      </div>
      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
        Rate your experience, it takes a second and helps improve the platform.
      </p>
      <div
        role="group"
        aria-label="Rating"
        style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}
      >
        {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} ${n === 1 ? "star" : "stars"}`}
            aria-pressed={rating === n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 28,
              lineHeight: 1,
              padding: "0.25rem",
              color: n <= displayed ? "#f59e0b" : "var(--text-muted)",
            }}
          >
            {n <= displayed ? "★" : "☆"}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything we should know? (optional)"
        rows={2}
        aria-label="Feedback comment"
        style={{
          width: "100%",
          resize: "vertical",
          padding: "0.5rem",
          fontSize: "0.8125rem",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface-elevated)",
          color: "var(--text-primary)",
          boxSizing: "border-box",
          marginBottom: "0.75rem",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button
          className="btn btn-primary"
          style={{ textAlign: "center", fontSize: "0.875rem" }}
          onClick={handleSubmit}
          disabled={rating < 1 || submitting}
        >
          {submitting ? "Sending…" : "Submit feedback"}
        </button>
        <button
          className="btn"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
          }}
          onClick={handleLater}
        >
          Maybe later
        </button>
        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            fontSize: "0.8125rem",
            cursor: "pointer",
            textDecoration: "underline",
          }}
          onClick={handleNever}
        >
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}
