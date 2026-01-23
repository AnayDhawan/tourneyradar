"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import BaseLayout from "../../components/BaseLayout";
import TournamentCardSkeleton from "../../components/TournamentCardSkeleton";
import { getCountdown, isNewTournament } from "../../lib/countdown";

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
  organizer_name?: string;
  created_at?: string;
  organizers?: {
    id: string;
    name: string;
    verified_badge?: boolean;
  };
}

interface Props {
  initialTournaments: Tournament[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function TournamentsClient({ initialTournaments }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const safeIncludes = (str: string | null | undefined, search: string): boolean => {
    return str?.toLowerCase().includes(search.toLowerCase()) ?? false;
  };

  const filteredTournaments = useMemo(() => {
    return initialTournaments.filter((t: Tournament) => {
      if (!debouncedSearch) return true;
      const query = debouncedSearch.toLowerCase();
      return (
        safeIncludes(t.name, query) ||
        safeIncludes(t.location, query) ||
        safeIncludes(t.city, query) ||
        safeIncludes(t.state, query) ||
        safeIncludes(t.country, query) ||
        safeIncludes(t.organizer_name, query) ||
        safeIncludes(t.organizers?.name, query)
      );
    });
  }, [initialTournaments, debouncedSearch]);

  return (
    <BaseLayout 
      showHero 
      heroTitle={<>Upcoming <span className="highlight">Tournaments</span></>}
      heroDescription="Browse over-the-board chess tournaments from around the world. Data sourced from Chess-Results.com."
    >
      <section className="tournament-section">
        <div className="section-container">
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ position: "relative", maxWidth: "600px", margin: "0 auto" }}>
              <input
                type="text"
                placeholder="Search tournaments, locations, organizers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{
                  width: "100%",
                  paddingLeft: "3rem",
                  fontSize: "1rem"
                }}
              />
              <span style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1.25rem",
                color: "var(--text-secondary)"
              }}>                
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: "absolute",
                    right: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                >
                  ×
                </button>
              )}
            </div>
            {debouncedSearch && (
              <p style={{ 
                textAlign: "center", 
                marginTop: "1rem", 
                color: "var(--text-secondary)",
                fontSize: "0.875rem"
              }}>
                Found {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {filteredTournaments.length === 0 ? (
            <div className="loading-message">
              {debouncedSearch ? `No tournaments found for "${debouncedSearch}"` : "No tournaments found."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 350px), 1fr))", gap: "1.5rem" }}>
              {filteredTournaments.map((tournament: Tournament) => (
                <div key={tournament.id} className="card" style={{ display: "flex", flexDirection: "column" }}>
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

                    <div style={{ fontSize: "0.875rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>By: </span>
                      {tournament.organizers?.id ? (
                        <Link 
                          href={`/organizers/${tournament.organizers.id}`}
                          style={{ 
                            color: "var(--primary)", 
                            textDecoration: "none", 
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {tournament.organizers.name}
                          {tournament.organizers.verified_badge && (
                            <span style={{ 
                              color: "#3b82f6",
                              fontSize: "1rem",
                              lineHeight: 1 
                            }}>
                              Verified
                            </span>
                          )}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>
                          {tournament.organizer_name || "Unknown"}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link href={`/tournaments/${tournament.id}`} className="btn btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", textDecoration: "none" }}>
                    View Details →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </BaseLayout>
  );
}
