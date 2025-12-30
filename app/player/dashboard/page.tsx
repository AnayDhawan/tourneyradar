"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, type Tournament } from "../../../lib/supabase";
import Footer from "../../../components/Footer";

type Tab = "registrations" | "wishlist" | "browse";

type Player = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  fide_id: string | null;
  rating: number | null;
  auth_user_id: string;
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("registrations");
  const [player, setPlayer] = useState<Player | null>(null);
  const [registeredTournaments, setRegisteredTournaments] = useState<Tournament[]>([]);
  const [favoriteTournaments, setFavoriteTournaments] = useState<Tournament[]>([]);
    const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [favoriteTournamentIds, setFavoriteTournamentIds] = useState<Set<string>>(new Set());
    const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('Password updated successfully!');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error:', err);
      alert('Failed to update password: ' + err.message);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) {
      alert('Please enter a new email address');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      alert('Verification email sent to ' + newEmail + '. Please check your inbox to confirm.');
      setShowEmailModal(false);
      setNewEmail('');
    } catch (err: any) {
      console.error('Error:', err);
      alert('Failed to update email: ' + err.message);
    }
  };

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    async function checkAuthAndFetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/player/login");
          return;
        }

        const { data: playerData, error: playerError } = await supabase
          .from("players")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();

        if (playerError || !playerData) {
          router.push("/player/login");
          return;
        }

        setPlayer(playerData as Player);

        // Fetch registrations
        const { data: regsData } = await supabase
          .from("player_registrations")
          .select("tournament_id")
          .eq("player_id", playerData.id);

        const regIds = new Set((regsData ?? []).map((r: any) => r.tournament_id));
        setRegisteredIds(regIds);

        if (regIds.size > 0) {
          const { data: regTournaments } = await supabase
            .from("tournaments")
            .select("*")
            .in("id", Array.from(regIds));
          setRegisteredTournaments((regTournaments ?? []) as Tournament[]);
        }

        // Fetch favorite tournaments
        const { data: favTournsData } = await supabase
          .from("player_favorite_tournaments")
          .select("tournament_id")
          .eq("player_id", playerData.id);

        const favTournIds = new Set((favTournsData ?? []).map((f: any) => f.tournament_id));
        setFavoriteTournamentIds(favTournIds);

        if (favTournIds.size > 0) {
          const { data: favTournaments } = await supabase
            .from("tournaments")
            .select("*")
            .in("id", Array.from(favTournIds));
          setFavoriteTournaments((favTournaments ?? []) as Tournament[]);
        }

        // Fetch all tournaments for browsing
        const { data: allTourns } = await supabase
          .from("tournaments")
          .select("*")
          .eq("status", "published")
          .order("date", { ascending: true });
        setAllTournaments((allTourns ?? []) as Tournament[]);

      } catch (error) {
        console.error("Auth error:", error);
        router.push("/player/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndFetchData();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/player/login");
  }

  async function handleRegister(tournamentId: string) {
    if (!player) return;
    const { error } = await supabase.from("player_registrations").insert({
      player_id: player.id,
      tournament_id: tournamentId,
    });
    if (!error) {
      setRegisteredIds(new Set([...registeredIds, tournamentId]));
      const tournament = allTournaments.find((t) => t.id === tournamentId);
      if (tournament) {
        setRegisteredTournaments([...registeredTournaments, tournament]);
      }
    }
  }

  async function handleCancelRegistration(tournamentId: string) {
    if (!player) return;
    const { error } = await supabase
      .from("player_registrations")
      .delete()
      .eq("player_id", player.id)
      .eq("tournament_id", tournamentId);
    if (!error) {
      const newIds = new Set(registeredIds);
      newIds.delete(tournamentId);
      setRegisteredIds(newIds);
      setRegisteredTournaments(registeredTournaments.filter((t) => t.id !== tournamentId));
    }
  }

  async function handleToggleFavoriteTournament(tournamentId: string) {
    if (!player) return;
    if (favoriteTournamentIds.has(tournamentId)) {
      const { error } = await supabase
        .from("player_favorite_tournaments")
        .delete()
        .eq("player_id", player.id)
        .eq("tournament_id", tournamentId);
      if (!error) {
        const newIds = new Set(favoriteTournamentIds);
        newIds.delete(tournamentId);
        setFavoriteTournamentIds(newIds);
        setFavoriteTournaments(favoriteTournaments.filter((t) => t.id !== tournamentId));
      }
    } else {
      const { error } = await supabase.from("player_favorite_tournaments").insert({
        player_id: player.id,
        tournament_id: tournamentId,
      });
      if (!error) {
        setFavoriteTournamentIds(new Set([...favoriteTournamentIds, tournamentId]));
        const tournament = allTournaments.find((t) => t.id === tournamentId);
        if (tournament) {
          setFavoriteTournaments([...favoriteTournaments, tournament]);
        }
      }
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div className="loading-message">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-bg" style={{ minHeight: "25vh", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none" }}>Tournaments</Link>
              <button
                onClick={handleLogout}
                style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "1rem", fontWeight: 500 }}
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Player <span className="highlight">Dashboard</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container">
          {/* Player Info Card */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Welcome, {player?.name}!
            </h2>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", color: "var(--text-secondary)" }}>
              <span>📧 {player?.email}</span>
              {player?.fide_id && <span>🆔 FIDE: {player.fide_id}</span>}
              {player?.rating && <span>⭐ Rating: {player.rating}</span>}
              {player?.phone && <span>📞 {player.phone}</span>}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="btn"
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", background: "var(--surface-elevated)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
              >
                🔒 Change Password
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn"
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", background: "var(--surface-elevated)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
              >
                ✉️ Change Email
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="view-toggle" style={{ marginBottom: "2rem" }}>
            <button className={activeTab === "registrations" ? "active" : ""} onClick={() => setActiveTab("registrations")}>
              My Registrations ({registeredTournaments.length})
            </button>
            <button className={activeTab === "wishlist" ? "active" : ""} onClick={() => setActiveTab("wishlist")}>
              💙 Wishlist ({favoriteTournaments.length})
            </button>
            <button className={activeTab === "browse" ? "active" : ""} onClick={() => setActiveTab("browse")}>
              Browse All
            </button>
          </div>

          {/* My Registrations Tab */}
          {activeTab === "registrations" && (
            <div>
              {registeredTournaments.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏆</div>
                  <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    No registrations yet
                  </h3>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    Browse tournaments and register for events!
                  </p>
                  <button onClick={() => setActiveTab("browse")} className="btn btn-primary">
                    Browse Tournaments
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
                  {registeredTournaments.map((t) => (
                    <div key={t.id} className="card">
                      <div style={{ marginBottom: "1rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          {t.fide_rated && <span className="badge badge-fide">FIDE</span>}
                          <span className="badge">{t.category}</span>
                          <span className="badge" style={{ background: "var(--success)", color: "white" }}>Registered ✓</span>
                        </div>
                        <h3 className="font-display" style={{ fontSize: "1.125rem", fontWeight: 700 }}>{t.name}</h3>
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>📅 {formatDate(t.date)}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>📍 {t.location}, {t.state}</div>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <Link href={`/tournaments/${t.id}`} className="btn" style={{ flex: 1, background: "var(--surface-elevated)", border: "2px solid var(--border)", textDecoration: "none", textAlign: "center", color: "white"}}>
                          View
                        </Link>
                        <button onClick={() => handleCancelRegistration(t.id)} className="btn" style={{ background: "var(--error)", color: "white", border: "none" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wishlist Tab */}
          {activeTab === "wishlist" && (
            <div>
              {favoriteTournaments.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                  <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>💙</div>
                  <h3 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    No tournaments in wishlist
                  </h3>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Add tournaments to your wishlist to track them!
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
                  {favoriteTournaments.map((t) => (
                    <div key={t.id} className="card">
                      <div style={{ marginBottom: "1rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          {t.fide_rated && <span className="badge badge-fide">FIDE</span>}
                          <span className="badge">{t.category}</span>
                        </div>
                        <h3 className="font-display" style={{ fontSize: "1.125rem", fontWeight: 700 }}>{t.name}</h3>
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>📅 {formatDate(t.date)}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>📍 {t.location}, {t.state}</div>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <Link href={`/tournaments/${t.id}`} className="btn" style={{ flex: 1, background: "var(--surface-elevated)", border: "2px solid var(--border)", textDecoration: "none", textAlign: "center" }}>
                          View
                        </Link>
                        <button onClick={() => handleToggleFavoriteTournament(t.id)} className="btn" style={{ background: "var(--error)", color: "white", border: "none" }}>
                          ♥ Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Browse All Tab */}
          {activeTab === "browse" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
              {allTournaments.map((t) => (
                <div key={t.id} className="card">
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {t.fide_rated && <span className="badge badge-fide">FIDE</span>}
                        <span className="badge">{t.category}</span>
                        {registeredIds.has(t.id) && <span className="badge" style={{ background: "var(--success)", color: "white" }}>Registered</span>}
                      </div>
                      <button
                        onClick={() => handleToggleFavoriteTournament(t.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem" }}
                        title={favoriteTournamentIds.has(t.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        {favoriteTournamentIds.has(t.id) ? "❤️" : "🤍"}
                      </button>
                    </div>
                    <h3 className="font-display" style={{ fontSize: "1.125rem", fontWeight: 700 }}>{t.name}</h3>
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>📅 {formatDate(t.date)}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>📍 {t.location}, {t.state}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>💰 {t.entry_fee} | 🏆 {t.prize_pool}</div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <Link href={`/tournaments/${t.id}`} className="btn" style={{ flex: 1, background: "var(--surface-elevated)", border: "2px solid var(--border)", textDecoration: "none", textAlign: "center" }}>
                      View
                    </Link>
                    {registeredIds.has(t.id) ? (
                      <button onClick={() => handleCancelRegistration(t.id)} className="btn" style={{ flex: 1, background: "var(--error)", color: "white", border: "none" }}>
                        Cancel
                      </button>
                    ) : (
                      <button onClick={() => handleRegister(t.id)} className="btn btn-primary" style={{ flex: 1 }}>
                        Register
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <>
          <div 
            onClick={() => setShowPasswordModal(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 999 }}
          />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, width: '90%', maxWidth: '500px' }}>
            <div className="card" style={{ padding: '2rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Change Password</h3>
              <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>New Password</label>
                  <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Confirm Password</label>
                  <input type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }} className="btn" style={{ background: 'var(--surface-elevated)', border: '2px solid var(--border)' }}>Cancel</button>
                <button onClick={handleChangePassword} className="btn btn-primary">Update Password</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Change Email Modal */}
      {showEmailModal && (
        <>
          <div 
            onClick={() => setShowEmailModal(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 999 }}
          />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, width: '90%', maxWidth: '500px' }}>
            <div className="card" style={{ padding: '2rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Change Email</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>A verification email will be sent to your new email address.</p>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>New Email Address</label>
                <input type="email" className="form-input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email address" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowEmailModal(false); setNewEmail(''); }} className="btn" style={{ background: 'var(--surface-elevated)', border: '2px solid var(--border)' }}>Cancel</button>
                <button onClick={handleChangeEmail} className="btn btn-primary">Send Verification Email</button>
              </div>
            </div>
          </div>
        </>
      )}
      <Footer />
    </div>
  );
}
