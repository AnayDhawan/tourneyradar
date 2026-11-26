"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BaseLayout from "@/components/BaseLayout";
import SaveButton from "@/components/SaveButton";
import { getCountdown, isNewTournament } from "@/lib/countdown";
import { trackEvent } from "@/lib/track";
import { useAuth } from "@/lib/AuthContext";
import { MAX_FILTER_RATING, MIN_FILTER_RATING, savedRatingOf, type RatingParam } from "@/lib/rating-filter";

interface Tournament {
  id: string;
  name: string;
  date: string;
  end_date?: string;
  city?: string;
  state?: string;
  location?: string;
  country?: string;
  country_code?: string;
  category?: string;
  fide_rated?: boolean;
  source_url?: string;
  external_link?: string;
  organizer_name?: string;
  created_at?: string;
}

interface Props {
  initialTournaments: Tournament[];
  page: number;
  totalPages: number;
  total: number;
  q: string;
  ratingParam: RatingParam;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

// True only in the browser. The countdown depends on the viewer's calendar date,
// which the server cannot know, so the server render leaves it out instead of
// rendering a UTC label that hydration would then contradict.
const noopSubscribe = () => () => {};
function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export default function TournamentsClient({ initialTournaments, page, totalPages, total, q, ratingParam }: Props) {
  const isClient = useIsClient();
  const router = useRouter();
  const { user, userType, loading: authLoading } = useAuth();
  const { rating } = ratingParam;

  // Signal FeedbackPrompt that the user got value (searched / opened a tournament).
  const markEngaged = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tr:engaged"));
    }
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    markEngaged();
    const searchQuery = new FormData(event.currentTarget).get("q");
    trackEvent("tournament_search_submitted", {
      has_query: typeof searchQuery === "string" && Boolean(searchQuery.trim()),
    });
  };

  const handleTournamentDetailOpen = (tournamentId: string) => {
    markEngaged();
    trackEvent("tournament_detail_opened", {
      tournament_id: tournamentId,
    });
  };

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (targetPage > 1) params.set("page", String(targetPage));
    // `rating=` stays in the URL, even empty, once the visitor has chosen:
    // absent means "default to my saved rating", empty means "show everything".
    if (ratingParam.present) params.set("rating", rating === null ? "" : String(rating));
    const qs = params.toString();
    return qs ? `/tournaments?${qs}` : "/tournaments";
  };

  // A signed-in player with a saved rating lands on their own eligibility view.
  // Runs once: after it, `rating` is in the URL and the visitor can change or
  // clear it freely.
  const savedRating = userType === "player" ? savedRatingOf(user) : null;
  const defaulted = useRef(false);
  useEffect(() => {
    if (ratingParam.present || authLoading || savedRating === null || defaulted.current) return;
    defaulted.current = true;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    params.set("rating", String(savedRating));
    router.replace(`/tournaments?${params.toString()}`, { scroll: false });
  }, [ratingParam.present, authLoading, savedRating, q, router]);

  return (
    <BaseLayout
      showHero
      heroTitle={<>Upcoming <span className="highlight">Tournaments</span></>}
      heroDescription="Browse over-the-board chess tournaments from around the world. Data sourced from Chess-Results.com."
    >
      <section className="tournament-section">
        <div className="section-container">
          <div style={{ marginBottom: "2rem" }}>
            <form
              method="get"
              action="/tournaments"
              onSubmit={handleSearchSubmit}
              style={{ position: "relative", maxWidth: "600px", margin: "0 auto" }}
            >
              {ratingParam.present && <input type="hidden" name="rating" value={rating ?? ""} />}
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search tournaments, locations, organizers..."
                aria-label="Search tournaments by name, location, or organizer"
                className="form-input"
                style={{
                  width: "100%",
                  paddingLeft: "3rem",
                  fontSize: "1rem",
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "1.25rem",
                  color: "var(--text-secondary)",
                }}
              >
              </span>
              {q && (
                <Link
                  href={ratingParam.present ? `/tournaments?rating=${rating ?? ""}` : "/tournaments"}
                  aria-label="Clear search"
                  onClick={markEngaged}
                  style={{
                    position: "absolute",
                    right: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                  }}
                >
                  ×
                </Link>
              )}
            </form>

            <form
              method="get"
              action="/tournaments"
              onSubmit={markEngaged}
              style={{ maxWidth: "600px", margin: "1rem auto 0", display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "0.75rem" }}
            >
              {q.trim() && <input type="hidden" name="q" value={q.trim()} />}
              <div className="filter-group" style={{ flex: "1 1 12rem" }}>
                <label htmlFor="rating-filter">Your rating</label>
                <input
                  key={rating ?? "none"}
                  id="rating-filter"
                  type="number"
                  name="rating"
                  inputMode="numeric"
                  min={MIN_FILTER_RATING}
                  max={MAX_FILTER_RATING}
                  step={1}
                  defaultValue={rating ?? ""}
                  placeholder="e.g. 1450"
                  aria-describedby="rating-filter-help"
                  aria-invalid={ratingParam.invalid || undefined}
                  className="form-input"
                />
              </div>
              <button type="submit" className="btn btn-primary">Apply</button>
              {ratingParam.present && (
                <Link
                  href={`/tournaments?${new URLSearchParams({ ...(q.trim() ? { q: q.trim() } : {}), rating: "" }).toString()}`}
                  className="btn"
                  onClick={markEngaged}
                >
                  Show all
                </Link>
              )}
              <p
                id="rating-filter-help"
                role={ratingParam.invalid ? "alert" : undefined}
                style={{ flexBasis: "100%", margin: 0, fontSize: "0.8125rem", color: ratingParam.invalid ? "var(--error)" : "var(--text-secondary)" }}
              >
                {ratingParam.invalid
                  ? `"Your rating" must be a whole number from ${MIN_FILTER_RATING} to ${MAX_FILTER_RATING}, so no rating filter is applied.`
                  : "Only show tournaments you can enter at this rating. Events with no rating limit always show. Leave empty to see all."}
              </p>
            </form>

            <p
              aria-live="polite"
              role="status"
              style={{
                textAlign: "center",
                marginTop: "1rem",
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
              }}
            >
              {total} tournament{total !== 1 ? "s" : ""} found{q ? ` for "${q}"` : ""}{rating !== null ? ` open to rating ${rating}` : ""}
            </p>
          </div>

          {initialTournaments.length === 0 ? (
            <div className="loading-message">
              {q ? `No tournaments found for "${q}"` : "No tournaments found."}{rating !== null ? ` None are open to rating ${rating}.` : ""}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 350px), 1fr))", gap: "1.5rem" }}>
              {initialTournaments.map((tournament: Tournament) => (
                <div key={tournament.id} className="card" style={{ display: "flex", flexDirection: "column", position: "relative" }}>
                  <SaveButton tournamentId={tournament.id} style={{ position: "absolute", top: "1.25rem", right: "1.25rem" }} />
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                      {tournament.created_at && isNewTournament(tournament.created_at) && (
                        <span style={{
                          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                          color: "white",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          textTransform: "uppercase"
                        }}>
                          NEW
                        </span>
                      )}
                      {tournament.fide_rated && <span className="badge badge-fide">FIDE</span>}
                      <span className="badge">{tournament.category}</span>
                      {isClient && getCountdown(tournament.date) && (
                        <span style={{
                          marginLeft: "auto",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--primary)",
                          background: "var(--surface-elevated)",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "12px"
                        }}>
                          {getCountdown(tournament.date)}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem", lineHeight: 1.3 }}>
                      {tournament.name}
                    </h3>
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                      <span>Date:</span>
                      <span>{formatDate(tournament.date)}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                      <span>Location:</span>
                      <span>{tournament.city || tournament.location || 'Unknown'}{tournament.country_code ? `, ${tournament.country_code}` : (tournament.state ? `, ${tournament.state}` : '')}</span>
                    </div>

                    {tournament.organizer_name && (
                      <div style={{ fontSize: "0.875rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>By: </span>
                        <span style={{ color: "var(--text-secondary)" }}>
                          {tournament.organizer_name}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link href={`/tournaments/${tournament.id}`} className="btn btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", textDecoration: "none" }} onClick={() => handleTournamentDetailOpen(tournament.id)}>
                    View Details →
                  </Link>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Tournament pagination"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "1rem",
                marginTop: "2rem",
              }}
            >
              {page > 1 ? (
                <Link href={buildHref(page - 1)} className="btn">← Previous</Link>
              ) : (
                <span className="btn" style={{ opacity: 0.5, pointerEvents: "none" }}>← Previous</span>
              )}
              <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={buildHref(page + 1)} className="btn">Next →</Link>
              ) : (
                <span className="btn" style={{ opacity: 0.5, pointerEvents: "none" }}>Next →</span>
              )}
            </nav>
          )}

          {initialTournaments.length > 0 && (
            <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Find this useful?{' '}
              <a
                href="https://github.com/AnayDhawan/tourneyradar"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}
                onClick={() => trackEvent("star_link", { src: "tournaments_nudge" })}
              >
                Star us on GitHub
              </a>
            </p>
          )}
        </div>
      </section>
    </BaseLayout>
  );
}
