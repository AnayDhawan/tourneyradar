"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import BaseLayout from "../../../components/BaseLayout";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function CompletedTournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompletedTournaments() {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("tournaments")
        .select("*, organizers(id, name, verified_badge)")
        .eq("status", "completed")
        .order("date", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setTournaments([]);
        setLoading(false);
        return;
      }

      setTournaments(data ?? []);
      setLoading(false);
    }

    fetchCompletedTournaments();
  }, []);

  return (
    <BaseLayout 
      showHero 
      heroTitle={<>Completed <span className="highlight">Tournaments</span></>}
      heroDescription="Browse past chess tournaments and their results from across India."
    >
      <section className="tournament-section">
        <div className="section-container">
          {loading ? (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 350px), 1fr))", 
              gap: "1.5rem" 
            }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="card" style={{ 
                  display: "flex", 
                  flexDirection: "column",
                  animation: "pulse 2s infinite"
                }}>
                  <div style={{ 
                    height: "24px", 
                    width: "100px", 
                    background: "var(--surface-elevated)", 
                    borderRadius: "12px",
                    marginBottom: "1rem"
                  }} />
                  <div style={{ 
                    height: "32px", 
                    width: "80%", 
                    background: "var(--surface-elevated)", 
                    borderRadius: "8px",
                    marginBottom: "1rem"
                  }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    <div style={{ height: "20px", width: "60%", background: "var(--surface-elevated)", borderRadius: "6px" }} />
                    <div style={{ height: "20px", width: "70%", background: "var(--surface-elevated)", borderRadius: "6px" }} />
                    <div style={{ height: "20px", width: "50%", background: "var(--surface-elevated)", borderRadius: "6px" }} />
                  </div>
                  <div style={{ 
                    height: "44px", 
                    width: "100%", 
                    background: "var(--surface-elevated)", 
                    borderRadius: "8px"
                  }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem", maxWidth: "600px", margin: "0 auto" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
              <h3 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
                Error Loading Tournaments
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                {error}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem", maxWidth: "600px", margin: "0 auto" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏆</div>
              <h3 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
                No Completed Tournaments Yet
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                Check back soon for past tournament results and histories!
              </p>
              <Link href="/tournaments" className="btn btn-primary" style={{ textDecoration: "none" }}>
                Browse Upcoming Tournaments
              </Link>
            </div>
          ) : (
            <>
              <div style={{ 
                marginBottom: "2rem", 
                padding: "1rem 1.5rem", 
                background: "var(--surface-elevated)", 
                borderRadius: "12px",
                border: "2px solid var(--border)"
              }}>
                <p style={{ 
                  color: "var(--text-secondary)", 
                  fontSize: "0.9375rem",
                  margin: 0
                }}>
                  📊 Showing <strong style={{ color: "var(--primary)" }}>{tournaments.length}</strong> completed tournament{tournaments.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 350px), 1fr))", 
                gap: "1.5rem" 
              }}>
                {tournaments.map((tournament: any) => (
                  <div key={tournament.id} className="card" style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    {/* COMPLETED Badge */}
                    <div style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      padding: "0.375rem 0.875rem",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
                    }}>
                      ✓ Completed
                    </div>

                    <div style={{ marginBottom: "1rem", paddingRight: "7rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                        {tournament.fide_rated && (
                          <span className="badge badge-fide">FIDE</span>
                        )}
                        <span className="badge">{tournament.category}</span>
                      </div>

                      <h3 className="font-display" style={{ 
                        fontSize: "1.25rem", 
                        fontWeight: 700, 
                        color: "var(--text-primary)", 
                        marginBottom: "1rem", 
                        lineHeight: 1.3 
                      }}>
                        {tournament.name}
                      </h3>
                    </div>

                    <div style={{ 
                      flex: 1, 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "0.75rem", 
                      marginBottom: "1.5rem" 
                    }}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.5rem", 
                        color: "var(--text-secondary)", 
                        fontSize: "0.9375rem" 
                      }}>
                        <span>📅</span>
                        <span>{formatDate(tournament.date)}</span>
                      </div>

                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.5rem", 
                        color: "var(--text-secondary)", 
                        fontSize: "0.9375rem" 
                      }}>
                        <span>📍</span>
                        <span>{tournament.location}, {tournament.state}</span>
                      </div>

                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "0.5rem", 
                        fontSize: "0.9375rem" 
                      }}>
                        <span>🏆</span>
                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                          {tournament.prize_pool}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.875rem" }}>
                        <span style={{ color: "var(--text-secondary)" }}>👤 By: </span>
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
                                ✓
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

                    <Link 
                      href={`/tournaments/${tournament.id}`} 
                      className="btn btn-primary" 
                      style={{ 
                        width: "100%", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: "0.5rem", 
                        textDecoration: "none" 
                      }}
                    >
                      View Details →
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </BaseLayout>
  );
}