"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase, type Tournament } from "../../lib/supabase";
import BaseLayout from "../../components/BaseLayout";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTournaments() {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("tournaments")
        .select("*, organizers(id, name)")
        .eq("status", "published")
        .order("date", { ascending: true });

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setTournaments([]);
        setLoading(false);
        return;
      }

      setTournaments((data ?? []) as Tournament[]);
      setLoading(false);
    }

    fetchTournaments();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BaseLayout 
      showHero 
      heroTitle={<>Upcoming <span className="highlight">Tournaments</span></>}
      heroDescription="Browse all upcoming chess tournaments across India. Find the perfect event to showcase your skills."
    >
      <section className="tournament-section">
        <div className="section-container">
          {loading ? (
            <div className="loading-message">Loading tournaments...</div>
          ) : error ? (
            <div className="loading-message" style={{ color: "var(--error)" }}>
              {error}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="loading-message">No tournaments found.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
              {tournaments.map((tournament: any) => (
                <div key={tournament.id} className="card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                      {tournament.fide_rated && <span className="badge badge-fide">FIDE</span>}
                      <span className="badge">{tournament.category}</span>
                    </div>

                    <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem", lineHeight: 1.3 }}>
                      {tournament.name}
                    </h3>
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                      <span>📅</span>
                      <span>{formatDate(tournament.date)}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                      <span>📍</span>
                      <span>{tournament.location}, {tournament.state}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9375rem" }}>
                      <span>💰</span>
                      <span style={{ fontWeight: 700, color: "var(--primary)" }}>{tournament.entry_fee}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
                      <span>🏆</span>
                      <span>{tournament.prize_pool}</span>
                    </div>

                    <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      👤 By: {tournament.organizers?.name || tournament.organizer_name || "Unknown"}
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
