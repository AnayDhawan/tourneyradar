"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { supabase, type Tournament } from "../../../lib/supabase";
import { getAnalyticsForTournaments, type AnalyticsEventType } from "../../../lib/analytics";
import dynamic from "next/dynamic";
import Footer from "../../../components/Footer";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });

type Organizer = {
  id: string;
  email: string;
  name: string;
  organization: string | null;
  phone: string | null;
  auth_user_id: string;
  tier?: string;
};

type TournamentAnalytics = Record<string, Record<AnalyticsEventType, number>>;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function OrganizerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [analytics, setAnalytics] = useState<TournamentAnalytics>({});
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
          router.push("/organizer/login");
          return;
        }

        // Fetch organizer profile
        const { data: organizerData, error: organizerError } = await supabase
          .from("organizers")
          .select("*")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (organizerError || !organizerData) {
          router.push("/organizer/login");
          return;
        }

        setOrganizer(organizerData as Organizer);

        // Fetch organizer's tournaments
        const { data: tournamentsData } = await supabase
          .from("tournaments")
          .select("*")
          .eq("organizer_id", organizerData.id)
          .order("date", { ascending: false });

        const tournamentsList = (tournamentsData ?? []) as Tournament[];
        setTournaments(tournamentsList);

        // Fetch analytics for tournaments
        if (tournamentsList.length > 0) {
          const tournamentIds = tournamentsList.map((t) => t.id);
          const analyticsData = await getAnalyticsForTournaments(tournamentIds);
          setAnalytics(analyticsData);
        }
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/organizer/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndFetchData();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/organizer/login");
  }

  async function handleDeleteTournament(tournamentId: string) {
    if (!confirm("Are you sure you want to delete this tournament?")) return;

    try {
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId);

      if (error) throw error;

      setTournaments(tournaments.filter((t) => t.id !== tournamentId));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete tournament");
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
      <section className="hero-bg" style={{ minHeight: "30vh", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none" }}>Tournaments</Link>
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: 500,
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Organizer <span className="highlight">Dashboard</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container">
          {/* Organizer Info Card */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Welcome, {organizer?.name}!
                  </h2>
                  {/* Tier Badge */}
                  {organizer?.tier === 'premium' && (
                    <span style={{
                      display: "inline-block",
                      padding: "0.5rem 1rem",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      borderRadius: "20px",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                      border: "2px solid rgba(255, 255, 255, 0.2)"
                    }}>
                      ⭐ PREMIUM
                    </span>
                  )}

                  {organizer?.tier === 'pro' && (
                    <span style={{
                      display: "inline-block",
                      padding: "0.5rem 1rem",
                      background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                      color: "white",
                      borderRadius: "20px",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      💎 PRO
                    </span>
                  )}

                  {organizer?.tier === 'enterprise' && (
                    <span style={{
                      display: "inline-block",
                      padding: "0.5rem 1rem",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      borderRadius: "20px",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)"
                    }}>
                      👑 ENTERPRISE
                    </span>
                  )}

                  {organizer?.tier === 'basic' && (
                    <span style={{
                      display: "inline-block",
                      padding: "0.5rem 1rem",
                      background: "var(--accent)",
                      color: "white",
                      borderRadius: "20px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      textTransform: "uppercase"
                    }}>
                      BASIC
                    </span>
                  )}

                  {(!organizer?.tier || organizer?.tier === 'free') && (
                    <span style={{
                      display: "inline-block",
                      padding: "0.5rem 1rem",
                      background: "var(--surface-elevated)",
                      color: "var(--text-secondary)",
                      borderRadius: "20px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      border: "2px solid var(--border)"
                    }}>
                      FREE
                    </span>
                  )}
                </div>
                <p style={{ color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  📧 {organizer?.email}
                </p>
                {organizer?.organization && (
                  <p style={{ color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    🏢 {organizer.organization}
                  </p>
                )}
                {organizer?.phone && (
                  <p style={{ color: "var(--text-secondary)" }}>
                    📞 {organizer.phone}
                  </p>
                )}
                {/* Tier Limits Info */}
                <div style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  {(!organizer?.tier || organizer.tier === "free") && (
                    <span>📊 {tournaments.length}/2 tournaments (Free tier)</span>
                  )}
                  {organizer?.tier === "basic" && (
                    <span>📊 {tournaments.length}/10 tournaments (Basic tier)</span>
                  )}
                  {organizer?.tier === "pro" && (
                    <span>📊 {tournaments.length} tournaments (Unlimited)</span>
                  )}
                  {organizer?.tier === "enterprise" && (
                    <span>📊 {tournaments.length} tournaments (Unlimited + Priority)</span>
                  )}
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
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-end" }}>
                {/* Check tier limits before showing Add button */}
                {((!organizer?.tier || organizer.tier === "free") && tournaments.length >= 2) ? (
                  <div style={{ textAlign: "right" }}>
                    <button className="btn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                      + Add New Tournament
                    </button>
                    <p style={{ fontSize: "0.75rem", color: "var(--error)", marginTop: "0.5rem" }}>
                      Limit reached. Contact us to upgrade.
                    </p>
                  </div>
                ) : (organizer?.tier === "basic" && tournaments.length >= 10) ? (
                  <div style={{ textAlign: "right" }}>
                    <button className="btn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                      + Add New Tournament
                    </button>
                    <p style={{ fontSize: "0.75rem", color: "var(--error)", marginTop: "0.5rem" }}>
                      Limit reached. Contact us to upgrade.
                    </p>
                  </div>
                ) : (
                  <Link
                    href="/organizer/tournament/new"
                    className="btn btn-primary"
                    style={{ textDecoration: "none" }}
                  >
                    + Add New Tournament
                  </Link>
                )}
                {(!organizer?.tier || organizer.tier === "free" || organizer.tier === "basic") && (
                  <a
                    href="https://wa.me/918976191515?text=Hi,%20I%20want%20to%20upgrade%20my%20TourneyRadar%20plan"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.75rem", color: "var(--primary)" }}
                  >
                    Upgrade Plan →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Tournaments Section */}
          <h2 className="section-title font-display" style={{ marginBottom: "1.5rem" }}>
            My <span className="highlight">Tournaments</span>
          </h2>

          {tournaments.length === 0 ? (
            <div>
              {/* Welcome Banner */}
              <div className="card" style={{ 
                textAlign: "center", 
                padding: "3rem",
                background: "linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)",
                color: "white",
                marginBottom: "2rem"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👋</div>
                <h3 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                  Welcome to TourneyRadar!
                </h3>
                <p style={{ opacity: 0.9, marginBottom: "2rem", maxWidth: "500px", margin: "0 auto 2rem" }}>
                  You're all set to start listing your chess tournaments. Follow the steps below to get started.
                </p>
                <Link
                  href="/organizer/tournament/new"
                  className="btn"
                  style={{ 
                    textDecoration: "none",
                    background: "white",
                    color: "var(--primary)",
                    fontWeight: 700,
                    padding: "1rem 2rem",
                    fontSize: "1.125rem"
                  }}
                >
                  + Add Your First Tournament
                </Link>
              </div>

              {/* Getting Started Steps */}
              <div className="card" style={{ marginBottom: "2rem" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1.5rem" }}>
                  🚀 Get Started in 3 Steps
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <div style={{ 
                      width: "50px", 
                      height: "50px", 
                      borderRadius: "50%", 
                      background: "var(--primary)", 
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      margin: "0 auto 1rem"
                    }}>1</div>
                    <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Add Tournament</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Fill in your tournament details, dates, venue, and prizes
                    </p>
                  </div>
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <div style={{ 
                      width: "50px", 
                      height: "50px", 
                      borderRadius: "50%", 
                      background: "var(--primary)", 
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      margin: "0 auto 1rem"
                    }}>2</div>
                    <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Share with Players</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Share your tournament link on social media and WhatsApp groups
                    </p>
                  </div>
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <div style={{ 
                      width: "50px", 
                      height: "50px", 
                      borderRadius: "50%", 
                      background: "var(--primary)", 
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      margin: "0 auto 1rem"
                    }}>3</div>
                    <h4 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Track Engagement</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Monitor views, registrations, and player interest
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="card">
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                  💡 Quick Tips for Success
                </h3>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.25rem" }}>📸</span>
                    <div>
                      <h4 style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Upload High-Quality Details</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Include complete tournament info, clear rules, and accurate prize distribution</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.25rem" }}>🔗</span>
                    <div>
                      <h4 style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Include Clear Registration Links</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Add your Google Form or WhatsApp group link for easy player registration</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.25rem" }}>📊</span>
                    <div>
                      <h4 style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Check Analytics Regularly</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Monitor your tournament's performance and adjust your promotion strategy</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.25rem" }}>💬</span>
                    <div>
                      <h4 style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Respond to Player Queries</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Quick responses build trust and increase registrations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="card">
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {tournament.name}
                      </h3>
                      <span
                        className="badge"
                        style={{
                          background: tournament.status === "published" ? "var(--success)" : "var(--accent)",
                          color: "white",
                        }}
                      >
                        {tournament.status}
                      </span>
                    </div>
                    {tournament.fide_rated && (
                      <span className="badge badge-fide" style={{ marginRight: "0.5rem" }}>FIDE</span>
                    )}
                    <span className="badge">{tournament.category}</span>
                  </div>

                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                    📍 {tournament.location}, {tournament.state}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                    📅 {formatDate(tournament.date)}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                    💰 Prize: {tournament.prize_pool}
                  </div>

                  {/* Analytics - only show for non-free tiers */}
                  {organizer?.tier && organizer.tier !== "free" && analytics[tournament.id] && (
                    <div style={{ 
                      display: "flex", 
                      gap: "1rem", 
                      fontSize: "0.875rem", 
                      color: "var(--text-secondary)",
                      flexWrap: "wrap",
                      marginBottom: "1rem"
                    }}>
                      <span>{analytics[tournament.id].view} views</span>
                      <span>•</span>
                      <span>{analytics[tournament.id].registration_click} registrations</span>
                    </div>
                  )}

                  {/* Platform Registrations Display */}
                  {(tournament as any).registrations_from_platform > 0 && (
                    <div style={{ 
                      marginBottom: "0.75rem", 
                      padding: "0.5rem", 
                      background: "var(--surface-elevated)", 
                      borderRadius: "6px",
                      fontSize: "0.875rem"
                    }}>
                      <strong>📊 Platform Registrations:</strong> {(tournament as any).registrations_from_platform}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <Link
                      href={`/tournaments/${tournament.id}`}
                      className="btn"
                      style={{
                        flex: 1,
                        background: "var(--surface-elevated)",
                        border: "2px solid var(--border)",
                        color: "var(--text-primary)",
                        textDecoration: "none",
                      }}
                    >
                      View
                    </Link>
                    <Link
                      href={`/organizer/tournament/${tournament.id}/edit`}
                      className="btn btn-primary"
                      style={{ flex: 1, textDecoration: "none" }}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteTournament(tournament.id)}
                      className="btn"
                      style={{
                        background: "var(--error)",
                        color: "white",
                        border: "none",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  
                  
                </div>
              ))}
            </div>
          )}

          {/* Visual Analytics Section - Only for paid tiers */}
          {organizer?.tier && organizer.tier !== "free" && tournaments.length > 0 && (
            <div style={{ marginTop: "3rem" }}>
              <h2 className="section-title font-display" style={{ marginBottom: "1.5rem" }}>
                📊 Analytics <span className="highlight">Overview</span>
              </h2>

              {/* Summary Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--primary)" }}>
                    {Object.values(analytics).reduce((sum, a) => sum + (a.view || 0), 0)}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Total Views</div>
                </div>
                <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--success)" }}>
                    {Object.values(analytics).reduce((sum, a) => sum + (a.registration_click || 0), 0)}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Registrations</div>
                </div>
                <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>
                    {Object.values(analytics).reduce((sum, a) => sum + (a.pdf_download || 0), 0)}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>PDF Downloads</div>
                </div>
                <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "#25D366" }}>
                    {Object.values(analytics).reduce((sum, a) => sum + (a.whatsapp_click || 0), 0)}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>WhatsApp Clicks</div>
                </div>
              </div>

              {/* Charts */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
                {/* Bar Chart - Tournament Performance */}
                <div className="card" style={{ padding: "1.5rem" }}>
                  <h3 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                    Tournament Performance
                  </h3>
                  <div style={{ height: "300px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={tournaments.slice(0, 5).map((t) => ({
                          name: t.name.length > 15 ? t.name.substring(0, 15) + "..." : t.name,
                          views: analytics[t.id]?.view || 0,
                          registrations: analytics[t.id]?.registration_click || 0,
                        }))}
                        margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                      >
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11 }} 
                          angle={-45} 
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="views" fill="#6366f1" name="Views" />
                        <Bar dataKey="registrations" fill="#10b981" name="Registrations" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>                
              </div>

              {/* Conversion Rate */}
              <div className="card" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
                <h3 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "1rem" }}>
                  📈 Conversion Insights
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                  <div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      View → Registration Rate
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)" }}>
                      {(() => {
                        const views = Object.values(analytics).reduce((sum, a) => sum + (a.view || 0), 0);
                        const regs = Object.values(analytics).reduce((sum, a) => sum + (a.registration_click || 0), 0);
                        return views > 0 ? ((regs / views) * 100).toFixed(1) : 0;
                      })()}%
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      View → PDF Download Rate
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
                      {(() => {
                        const views = Object.values(analytics).reduce((sum, a) => sum + (a.view || 0), 0);
                        const pdfs = Object.values(analytics).reduce((sum, a) => sum + (a.pdf_download || 0), 0);
                        return views > 0 ? ((pdfs / views) * 100).toFixed(1) : 0;
                      })()}%
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      Avg. Engagement per Tournament
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--success)" }}>
                      {tournaments.length > 0 
                        ? Math.round(Object.values(analytics).reduce((sum, a) => 
                            sum + (a.view || 0) + (a.registration_click || 0) + (a.pdf_download || 0) + (a.whatsapp_click || 0), 0
                          ) / tournaments.length)
                        : 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade prompt for free tier */}
          {(!organizer?.tier || organizer.tier === "free") && tournaments.length > 0 && (
            <div className="card" style={{ 
              marginTop: "2rem", 
              padding: "2rem", 
              textAlign: "center",
              background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-elevated) 100%)",
              border: "2px dashed var(--border)"
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📊</div>
              <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                Unlock Analytics
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", maxWidth: "400px", margin: "0 auto 1.5rem" }}>
                Upgrade to Basic or higher to see detailed analytics, charts, and conversion insights for your tournaments.
              </p>
              <a
                href="https://wa.me/918976191515?text=Hi,%20I%20want%20to%20upgrade%20my%20TourneyRadar%20plan%20to%20see%20analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                Upgrade Now →
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <>
          <div onClick={() => setShowPasswordModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 999 }} />
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
          <div onClick={() => setShowEmailModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 999 }} />
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
