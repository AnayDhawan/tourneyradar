"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Footer from "@/components/Footer";
import { useThemePreference } from "@/lib/theme";
import { useToast } from "@/components/Toast";
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
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tournaments, setTournaments] = useState<WishlistTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralCount, setReferralCount] = useState<number | null>(null);

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

  // Issue #123: invite-a-friend count. This has to go through an RPC rather
  // than a plain `select count(*) from players where referred_by = ...`:
  // RLS on players scopes select to the owning row, so a direct client query
  // would just return 0 every time. my_referral_count() is SECURITY DEFINER
  // for exactly that reason (see the migration), it hands back a number and
  // nothing else.
  useEffect(() => {
    async function loadReferralCount() {
      if (!user || userType !== "player") return;

      const { data, error } = await supabase.rpc("my_referral_count");
      if (!error && typeof data === "number") {
        setReferralCount(data);
      }
    }

    if (user && userType === "player") {
      loadReferralCount();
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
      <MobileNavDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} userType={null} showThemeToggle />

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

          {/* Invite a friend (issue #123). Additive section, standalone card,
              does not touch the welcome card or saved-tournaments list above
              or below it. */}
          {user && userType === "player" && (user as any).referral_code ? (
            <div className="card" style={{ marginBottom: "2rem" }}>
              <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                Invite a friend
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                Share your link. {referralCount !== null && referralCount > 0
                  ? `${referralCount} ${referralCount === 1 ? "person has" : "people have"} joined so far.`
                  : "Anyone who signs up through it will be counted here."}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                <code
                  style={{
                    flex: "1 1 240px",
                    padding: "0.6rem 0.9rem",
                    background: "var(--surface-elevated)",
                    border: "2px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    overflow: "auto",
                    whiteSpace: "nowrap",
                  }}
                >
                  {typeof window !== "undefined" ? window.location.origin : ""}/?ref={(user as any).referral_code}
                </code>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flexShrink: 0 }}
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/?ref=${(user as any).referral_code}`;

                    if (navigator.share) {
                      try {
                        await navigator.share({ title: "TourneyRadar", url: shareUrl });
                        return;
                      } catch {
                        // User cancelled the share sheet, or it's unsupported for this
                        // context. Fall through to clipboard copy either way.
                      }
                    }

                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      showToast("Invite link copied", "success");
                    } catch {
                      showToast("Couldn't copy the link, copy it from the box above instead", "error");
                    }
                  }}
                >
                  Copy link
                </button>
              </div>
            </div>
          ) : null}

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