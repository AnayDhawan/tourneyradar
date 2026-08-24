"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BaseLayout from "@/components/BaseLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { trackEvent } from "@/lib/track";

const MAX_RATING = 5;
const REPO_URL = "https://github.com/AnayDhawan/tourneyradar";

function FeedbackForm() {
  const searchParams = useSearchParams();
  const fromPage = searchParams.get("from") || "/";
  const { user, userType } = useAuth();
  const { showToast } = useToast();

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const displayed = hover || rating;

  const handleSubmit = useCallback(async () => {
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    try {
      const playerId = userType === "player" ? (user?.id ?? null) : null;
      const { error } = await supabase.from("feedback").insert({
        player_id: playerId,
        rating,
        comment: comment.trim() || null,
        page_url: fromPage,
      });
      if (error) throw error;
      trackEvent("feedback_submitted", { rating, page: fromPage });
      try {
        localStorage.setItem("tr_feedback_ok", "1");
      } catch {
        /* ignore */
      }
      setDone(true);
    } catch (err) {
      console.error("Feedback submit failed:", err);
      showToast("Couldn't send feedback. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [rating, submitting, comment, fromPage, user, userType, showToast]);

  if (done) {
    return (
      <div className="feedback-card feedback-card-thanks">
        <div className="feedback-icon">🎉</div>
        <h1 className="font-display feedback-title">Thank you!</h1>
        <p className="feedback-subtitle">Your feedback helps shape what gets built next.</p>
        <p className="feedback-subtitle" style={{ marginTop: "0.5rem" }}>
          One more thing, if TourneyRadar has been useful, a GitHub star takes two
          seconds and helps a lot more than you&apos;d think.
        </p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-signup"
          style={{ textDecoration: "none", marginTop: "1.5rem" }}
          onClick={() => trackEvent("star_link", { src: "feedback_thanks" })}
        >
          ⭐ Star on GitHub
        </a>
        <Link
          href="/"
          style={{ marginTop: "1.25rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="feedback-card">
      <div className="feedback-icon">💬</div>
      <h1 className="font-display feedback-title">How&apos;s TourneyRadar working for you?</h1>
      <p className="feedback-subtitle">
        Rate your experience and tell us what to fix or build next. Takes 30 seconds.
      </p>

      <div role="group" aria-label="Rating" className="feedback-stars">
        {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} ${n === 1 ? "star" : "stars"}`}
            aria-pressed={rating === n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="feedback-star-btn"
            style={{ color: n <= displayed ? "#f59e0b" : "var(--text-muted)" }}
          >
            {n <= displayed ? "★" : "☆"}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything we should know? (optional)"
        rows={4}
        aria-label="Feedback comment"
        className="feedback-textarea"
      />

      <button
        type="button"
        className="btn btn-primary feedback-submit-btn"
        onClick={handleSubmit}
        disabled={rating < 1 || submitting}
      >
        {submitting ? "Sending…" : "Submit feedback"}
      </button>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <BaseLayout>
      <section className="feedback-section">
        <Suspense fallback={null}>
          <FeedbackForm />
        </Suspense>
      </section>
    </BaseLayout>
  );
}
