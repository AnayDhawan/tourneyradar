"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import BaseLayout from "../../../components/BaseLayout";

interface Tournament {
  id: string;
  name: string;
  date: string;
  end_date?: string;
  location?: string;
  city?: string;
  country?: string;
  country_code?: string;
  rounds?: number;
  fide_rated?: boolean;
  category?: string;
  format?: string;
  organizer_name?: string;
  source_url?: string;
  external_link?: string;
  source?: string;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "Unknown") return null;
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 500, width: "40%" }}>
        {label}
      </td>
      <td style={{ padding: "0.875rem 1rem", color: "var(--text-primary)" }}>
        {value}
      </td>
    </tr>
  );
}

export default function TournamentDetailPage() {
  const params = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTournament() {
      try {
        const { data, error: err } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", params.id)
          .single();

        if (err) throw err;
        setTournament(data);
      } catch (err: any) {
        setError(err.message || "Tournament not found");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) fetchTournament();
  }, [params.id]);

  if (loading) {
    return (
      <BaseLayout>
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
        </div>
      </BaseLayout>
    );
  }

  if (error || !tournament) {
    return (
      <BaseLayout>
        <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Tournament Not Found</h1>
          <p style={{ color: "var(--text-secondary)" }}>{error}</p>
          <Link href="/tournaments" className="btn btn-primary">Back to Tournaments</Link>
        </div>
      </BaseLayout>
    );
  }

  const dateDisplay = tournament.end_date && tournament.end_date !== tournament.date
    ? `${formatDate(tournament.date)} — ${formatDate(tournament.end_date)}` 
    : formatDate(tournament.date);

  const locationDisplay = [
    tournament.city || tournament.location,
    tournament.country || tournament.country_code
  ].filter(Boolean).join(", ");

  return (
    <BaseLayout showHero heroTitle={tournament.name}>
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "800px" }}>
          
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <InfoRow label="Date" value={dateDisplay} />
                <InfoRow label="Location" value={locationDisplay} />
                <InfoRow label="Organizer" value={tournament.organizer_name || ""} />
                <InfoRow label="Rounds" value={tournament.rounds?.toString() || ""} />
                <InfoRow label="Format" value={tournament.format || ""} />
                <InfoRow label="Category" value={tournament.category || ""} />
                <InfoRow label="FIDE Rated" value={tournament.fide_rated ? "Yes" : "No"} />
                <InfoRow label="Source" value={tournament.source || ""} />
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {tournament.source_url && (
              <a href={tournament.source_url} target="_blank" rel="noopener noreferrer"
                className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                View on Chess-Results
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
            
            {tournament.external_link && (
              <a href={tournament.external_link} target="_blank" rel="noopener noreferrer"
                className="btn" style={{ textDecoration: "none", background: "var(--surface-elevated)", border: "2px solid var(--border)" }}>
                Official Website
              </a>
            )}
            
            <Link href="/tournaments" className="btn" style={{ background: "transparent", border: "2px solid var(--border)", color: "var(--text-secondary)" }}>
              ← Back
            </Link>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
