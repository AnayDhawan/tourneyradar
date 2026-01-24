"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Footer from "@/components/Footer";

type WishlistTournament = {
  id: string;
  name: string;
  date: string;
  location: string;
  state: string;
  category: string;
  source?: string;
  source_url?: string;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function WishlistPage() {
  const router = useRouter();
  const { user, userType, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<WishlistTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Detect system theme preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = prefersDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/player/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function loadWishlist() {
      if (!user || userType !== "player") return;

      setLoading(true);
      
      // Get wishlist items
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("player_favorite_tournaments")
        .select("tournament_id")
        .eq("player_id", (user as any).id);

      if (wishlistError || !wishlistData?.length) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      const tournamentIds = wishlistData.map(w => w.tournament_id);

      // Get tournament details
      const { data: tournamentsData } = await supabase
        .from("tournaments")
        .select("id, name, date, location, state, category, source, source_url")
        .in("id", tournamentIds)
        .order("date", { ascending: true });

      setTournaments((tournamentsData || []) as WishlistTournament[]);
      setLoading(false);
    }

    if (user && userType === "player") {
      loadWishlist();
    }
  }, [user, userType]);

  async function removeFromWishlist(tournamentId: string) {
    if (!user) return;

    const { error } = await supabase
      .from("player_favorite_tournaments")
      .delete()
      .eq("player_id", (user as any).id)
      .eq("tournament_id", tournamentId);

    if (!error) {
      setTournaments(tournaments.filter(t => t.id !== tournamentId));
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div className="loading-message">Loading wishlist...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-bg" style={{ minHeight: "30vh", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none" }}>Tournaments</Link>
              <Link href="/about" style={{ textDecoration: "none" }}>About</Link>
              <Link href="/player/wishlist" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>My Wishlist</Link>
            </div>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            My <span className="highlight">Wishlist</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "900px" }}>
          {tournaments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❤️</div>
              <h2 className="font-display" style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
                Your wishlist is empty
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                Browse tournaments and click the heart icon to save them here.
              </p>
              <Link href="/tournaments" className="btn btn-primary" style={{ textDecoration: "none" }}>
                Browse Tournaments
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {tournaments.map(t => (
                <div key={t.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <Link href={`/tournaments/${t.id}`} style={{ textDecoration: "none" }}>
                      <h3 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                        {t.name}
                      </h3>
                    </Link>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                      📅 {formatDate(t.date)} • 📍 {t.location}, {t.state}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {t.category} {t.source && `• Source: ${t.source}`}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <Link href={`/tournaments/${t.id}`} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                      View Details
                    </Link>
                    {t.source_url && (
                      <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none", background: "var(--surface-elevated)", color: "var(--text-primary)" }}>
                        View Source
                      </a>
                    )}
                    <button
                      onClick={() => removeFromWishlist(t.id)}
                      className="btn"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", background: "var(--error)", color: "white", border: "none" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
