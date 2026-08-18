"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Footer from "@/components/Footer";
import { useThemePreference } from "@/lib/theme";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import SiteNav from "@/components/SiteNav";

type WishlistTournament = {
  id: string;
  name: string;
  date: string;
  location: string;
  state: string;
  category: string;
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

export default function PlayerDashboardPage() {
  const router = useRouter();
  const { user, userType, loading: authLoading } = useAuth();
  useThemePreference();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tournaments, setTournaments] = useState<WishlistTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/player/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function loadWishlist() {
      if (!user || userType !== "player") return;

      setLoading(true);

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

      const today = new Date().toISOString().split('T')[0];
      const { data: tournamentsData } = await supabase
        .from("tournaments")
        .select("id, name, date, location, state, category")
        .in("id", tournamentIds)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5);

      setTournaments((tournamentsData || []) as WishlistTournament[]);
      setLoading(false);
    }

    if (user && userType === "player") {
      loadWishlist();
    }
  }, [user, userType]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div className="loading-message">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <MobileNavDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} dashboard={null} showThemeToggle />

      <section className="hero-bg" style={{ minHeight: "30vh", display: "flex", flexDirection: "column" }}>
        <SiteNav onMenuClick={() => setMobileMenuOpen(true)} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Player <span className="highlight">Dashboard</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "900px" }}>
          {user && userType === "player" && (
            <div className="card" style={{ marginBottom: "2rem" }}>
              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
                Welcome back, {user.name || user.email}
              </h2>
              <div style={{ display: "grid", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                <p>📧 {user.email}</p>
                {(user as any).rating ? <p>⭐ Rating: {(user as any).rating}</p> : null}
                {(user as any).fide_id ? <p>🏆 FIDE ID: {(user as any).fide_id}</p> : null}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Saved Tournaments
            </h2>
            <Link href="/player/wishlist" style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem" }}>
              View full wishlist →
            </Link>
          </div>

          {tournaments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❤️</div>
              <h3 className="font-display" style={{ fontSize: "1.25rem", marginBottom: "0.75rem", color: "var(--text-primary)" }}>
                No saved tournaments yet
              </h3>
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
                      {t.category}
                    </p>
                  </div>
                  <Link href={`/tournaments/${t.id}`} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>
                    View Details
                  </Link>
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