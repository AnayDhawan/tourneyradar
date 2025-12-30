"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, type Tournament } from "../../../lib/supabase";
import Footer from "../../../components/Footer";

type Tab = "overview" | "organizers" | "tournaments" | "players" | "analytics";

type Organizer = {
  id: string;
  email: string;
  name: string;
  organization: string | null;
  phone: string | null;
  tier: string;
  is_active: boolean;
  created_at: string;
  verified_badge: boolean;
  total_tournaments_organized: number;
  total_players_served: number;
};

type Player = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  fide_id: string | null;
  rating: number | null;
  created_at: string;
};

type Stats = {
  totalTournaments: number;
  totalOrganizers: number;
  totalPlayers: number;
  totalViews: number;
  tierBreakdown: Record<string, number>;
  topTournaments: { id: string; name: string; views: number }[];
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tournamentAnalytics, setTournamentAnalytics] = useState<Record<string, { views: number; pdf: number; reg: number; wa: number }>>({});
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fideFilter, setFideFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Bulk selection
  const [selectedOrganizers, setSelectedOrganizers] = useState<string[]>([]);
  
  // Theme
  const [theme, setTheme] = useState("system");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "system";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(t: string) {
    if (t === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", t);
    }
  }

  function handleThemeChange(t: string) {
    setTheme(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  }

  useEffect(() => {
    async function checkAuthAndFetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/admin/login");
          return;
        }

        const { data: adminData, error: adminError } = await supabase
          .from("admins")
          .select("*")
          .eq("email", user.email)
          .single();

        if (adminError || !adminData) {
          await supabase.auth.signOut();
          router.push("/admin/login");
          return;
        }

        const [organizersRes, tournamentsRes, playersRes, analyticsRes] = await Promise.all([
          supabase.from("organizers").select("*").order("created_at", { ascending: false }),
          supabase.from("tournaments").select("*, organizers(id, name, email)").order("date", { ascending: false }),
          supabase.from("players").select("*").order("created_at", { ascending: false }),
          supabase.from("tournament_analytics").select("tournament_id, event_type"),
        ]);

        setOrganizers((organizersRes.data ?? []) as Organizer[]);
        setTournaments((tournamentsRes.data ?? []) as Tournament[]);
        setPlayers((playersRes.data ?? []) as Player[]);

        const orgList = (organizersRes.data ?? []) as Organizer[];
        const tournList = (tournamentsRes.data ?? []) as Tournament[];
        const playerList = (playersRes.data ?? []) as Player[];
        const analyticsList = analyticsRes.data ?? [];

        const tierBreakdown: Record<string, number> = {};
        for (const org of orgList) {
          const tier = org.tier || "free";
          tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1;
        }

        const viewCounts: Record<string, number> = {};
        const analyticsMap: Record<string, { views: number; pdf: number; reg: number; wa: number }> = {};
        let totalViews = 0;

        for (const a of analyticsList) {
          if (!analyticsMap[a.tournament_id]) {
            analyticsMap[a.tournament_id] = { views: 0, pdf: 0, reg: 0, wa: 0 };
          }
          if (a.event_type === "view") {
            analyticsMap[a.tournament_id].views++;
            viewCounts[a.tournament_id] = (viewCounts[a.tournament_id] || 0) + 1;
            totalViews++;
          } else if (a.event_type === "pdf_download") {
            analyticsMap[a.tournament_id].pdf++;
          } else if (a.event_type === "registration_click") {
            analyticsMap[a.tournament_id].reg++;
          } else if (a.event_type === "whatsapp_click") {
            analyticsMap[a.tournament_id].wa++;
          }
        }

        setTournamentAnalytics(analyticsMap);

        const topTournaments = tournList
          .map((t) => ({ id: t.id, name: t.name, views: viewCounts[t.id] || 0 }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10);

        setStats({
          totalTournaments: tournList.length,
          totalOrganizers: orgList.length,
          totalPlayers: playerList.length,
          totalViews,
          tierBreakdown,
          topTournaments,
        });
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndFetchData();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  async function handleDeleteOrganizer(id: string) {
    if (!confirm("Delete this organizer? Their tournaments will remain.")) return;
    const { error } = await supabase.from("organizers").delete().eq("id", id);
    if (!error) {
      setOrganizers(organizers.filter((o) => o.id !== id));
      setSelectedOrganizers(selectedOrganizers.filter(s => s !== id));
    }
  }

  async function handleToggleVerified(id: string, currentStatus: boolean) {
    const { error } = await supabase.from("organizers").update({ verified_badge: !currentStatus }).eq("id", id);
    if (!error) {
      setOrganizers(organizers.map((o) => o.id === id ? { ...o, verified_badge: !currentStatus } : o));
    }
  }

  async function handleChangeTier(id: string, newTier: string) {
    const { error } = await supabase.from("organizers").update({ tier: newTier }).eq("id", id);
    if (!error) {
      setOrganizers(organizers.map((o) => o.id === id ? { ...o, tier: newTier } : o));
    }
  }

  async function handleBulkVerify() {
    if (selectedOrganizers.length === 0) return;
    for (const id of selectedOrganizers) {
      await supabase.from("organizers").update({ verified_badge: true }).eq("id", id);
    }
    setOrganizers(organizers.map(o => selectedOrganizers.includes(o.id) ? { ...o, verified_badge: true } : o));
    setSelectedOrganizers([]);
    alert(`${selectedOrganizers.length} organizers verified!`);
  }

  async function handleBulkChangeTier() {
    const newTier = prompt("Enter new tier (free, pro, premium):");
    if (!newTier || !["free", "pro", "premium"].includes(newTier)) {
      alert("Invalid tier");
      return;
    }
    for (const id of selectedOrganizers) {
      await supabase.from("organizers").update({ tier: newTier }).eq("id", id);
    }
    setOrganizers(organizers.map(o => selectedOrganizers.includes(o.id) ? { ...o, tier: newTier } : o));
    setSelectedOrganizers([]);
    alert(`${selectedOrganizers.length} organizers updated to ${newTier}!`);
  }

  async function handleDeleteTournament(id: string) {
    if (!confirm("Delete this tournament?")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (!error) setTournaments(tournaments.filter((t) => t.id !== id));
  }

  async function handleChangeTournamentStatus(id: string, newStatus: string) {
    const { error } = await supabase.from("tournaments").update({ status: newStatus }).eq("id", id);
    if (!error) {
      setTournaments(tournaments.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    }
  }

  async function handleSetPlayerCount(tournamentId: string, organizerId: string) {
    const count = prompt("Enter final player count:");
    if (!count) return;
    
    const playerCount = parseInt(count);
    if (isNaN(playerCount) || playerCount < 0) {
      alert("Invalid number");
      return;
    }
    
    try {
      const tournament = tournaments.find(t => t.id === tournamentId);
      const wasCompleted = tournament?.status === "completed";
      const previousCount = (tournament as any)?.final_player_count || 0;
      
      const { error: tournError } = await supabase
        .from("tournaments")
        .update({ final_player_count: playerCount, status: "completed" })
        .eq("id", tournamentId);
      
      if (tournError) throw tournError;
      
      if (!wasCompleted) {
        const org = organizers.find(o => o.id === organizerId);
        await supabase
          .from("organizers")
          .update({
            total_tournaments_organized: (org?.total_tournaments_organized || 0) + 1,
            total_players_served: (org?.total_players_served || 0) + playerCount
          })
          .eq("id", organizerId);
        
        setOrganizers(organizers.map(o => o.id === organizerId ? {
          ...o,
          total_tournaments_organized: (o.total_tournaments_organized || 0) + 1,
          total_players_served: (o.total_players_served || 0) + playerCount
        } : o));
      } else {
        const diff = playerCount - previousCount;
        const org = organizers.find(o => o.id === organizerId);
        await supabase
          .from("organizers")
          .update({ total_players_served: (org?.total_players_served || 0) + diff })
          .eq("id", organizerId);
        
        setOrganizers(organizers.map(o => o.id === organizerId ? {
          ...o,
          total_players_served: (o.total_players_served || 0) + diff
        } : o));
      }
      
      setTournaments(tournaments.map(t => t.id === tournamentId ? {
        ...t,
        status: "completed",
        final_player_count: playerCount
      } as any : t));
      
      alert("Player count updated!");
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to update");
    }
  }

  async function handleDeletePlayer(id: string) {
    if (!confirm("Delete this player?")) return;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (!error) setPlayers(players.filter((p) => p.id !== id));
  }

  // Filtered data
  const filteredOrganizers = organizers.filter((o) => {
    const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = tierFilter === "all" || (o.tier || "free") === tierFilter;
    const matchesVerified = verifiedFilter === "all" || 
      (verifiedFilter === "verified" && o.verified_badge) ||
      (verifiedFilter === "unverified" && !o.verified_badge);
    return matchesSearch && matchesTier && matchesVerified;
  });

  const filteredTournaments = tournaments.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    const matchesFide = fideFilter === "all" || 
      (fideFilter === "fide" && t.fide_rated) ||
      (fideFilter === "non-fide" && !t.fide_rated);
    const matchesDateFrom = !dateFrom || new Date(t.date) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(t.date) <= new Date(dateTo);
    return matchesSearch && matchesStatus && matchesCategory && matchesFide && matchesDateFrom && matchesDateTo;
  });

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function exportTournamentsCSV() {
    const csv = "Name,Organizer,Date,Status,Category,Players,Prize Pool\n" +
      filteredTournaments.map((t: any) => 
        `"${t.name}","${t.organizers?.name || t.organizer_name || 'N/A'}","${t.date}","${t.status}","${t.category}","${t.final_player_count || 0}","${t.prize_pool || ''}"` 
      ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tournaments.csv";
    a.click();
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div className="loading-message">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-bg" style={{ minHeight: "20vh", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none" }}>Tournaments</Link>
              
                          
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: "0.5rem 1rem" }}>
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center", fontSize: "2rem" }}>
            Admin <span className="highlight">Dashboard</span>
          </h1>
        </div>
      </section>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-drawer">
            <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)}>×</button>
            <div className="mobile-drawer-logo">
              <span className="nav-brand font-display">TourneyRadar</span>
            </div>
            <nav className="mobile-drawer-nav">
              <Link href="/tournaments" onClick={() => setMobileMenuOpen(false)}>Tournaments</Link>
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "1.125rem", textAlign: "left", cursor: "pointer" }}>
                Logout
              </button>
            </nav>
            <div className="mobile-drawer-theme">
              <div className="mobile-drawer-theme-label">Theme</div>
              <div className="theme-toggle">
                <button className={`theme-btn ${theme === "light" ? "active" : ""}`} onClick={() => handleThemeChange("light")}>Light</button>
                <button className={`theme-btn ${theme === "dark" ? "active" : ""}`} onClick={() => handleThemeChange("dark")}>Dark</button>
                <button className={`theme-btn ${theme === "system" ? "active" : ""}`} onClick={() => handleThemeChange("system")}>Auto</button>
              </div>
            </div>
          </div>
        </>
      )}

      <section className="tournament-section">
        <div className="section-container">
          {/* Tabs */}
          <div className="view-toggle" style={{ marginBottom: "2rem", flexWrap: "wrap" }}>
            <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
              Overview
            </button>
            <button className={activeTab === "organizers" ? "active" : ""} onClick={() => { setActiveTab("organizers"); setSearchTerm(""); }}>
              Organizers ({organizers.length})
            </button>
            <button className={activeTab === "tournaments" ? "active" : ""} onClick={() => { setActiveTab("tournaments"); setSearchTerm(""); setStatusFilter("all"); }}>
              Tournaments ({tournaments.length})
            </button>
            <button className={activeTab === "players" ? "active" : ""} onClick={() => { setActiveTab("players"); setSearchTerm(""); }}>
              Players ({players.length})
            </button>
            <button className={activeTab === "analytics" ? "active" : ""} onClick={() => setActiveTab("analytics")}>
              Analytics
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && stats && (
            <div>
              {/* Stats Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)", color: "white" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏆</div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800 }}>{stats.totalTournaments}</div>
                  <div style={{ opacity: 0.9 }}>Total Tournaments</div>
                </div>
                
                <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>👥</div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800 }}>{stats.totalOrganizers}</div>
                  <div style={{ opacity: 0.9 }}>Total Organizers</div>
                </div>
                
                <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>♟️</div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800 }}>{stats.totalPlayers}</div>
                  <div style={{ opacity: 0.9 }}>Total Players</div>
                </div>
                
                <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", color: "white" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>👁️</div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800 }}>{stats.totalViews}</div>
                  <div style={{ opacity: 0.9 }}>Total Views</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="card" style={{ marginBottom: "2rem" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                  📊 Quick Stats
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem" }}>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Published Tournaments</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--primary)" }}>
                      {tournaments.filter(t => t.status === 'published').length}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Completed Tournaments</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--success)" }}>
                      {tournaments.filter(t => t.status === 'completed').length}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Premium Organizers</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#8b5cf6" }}>
                      {organizers.filter(o => o.tier === 'premium').length}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Verified Organizers</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--success)" }}>
                      {organizers.filter(o => o.verified_badge).length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tier Distribution */}
              <div className="card" style={{ marginBottom: "2rem" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                  💎 Tier Distribution
                </h3>
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center", padding: "1rem" }}>
                  {Object.entries(stats.tierBreakdown).map(([tier, count]) => (
                    <div key={tier} style={{ textAlign: "center", minWidth: "100px" }}>
                      <div style={{ 
                        width: "80px", 
                        height: "80px", 
                        borderRadius: "50%", 
                        background: tier === 'premium' ? '#8b5cf6' : tier === 'pro' ? 'var(--primary)' : 'var(--surface-elevated)',
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 0.75rem",
                        color: tier === 'premium' || tier === 'pro' ? 'white' : 'var(--text-primary)',
                        fontSize: "1.75rem",
                        fontWeight: 800
                      }}>
                        {count}
                      </div>
                      <div style={{ textTransform: "capitalize", fontWeight: 600 }}>{tier}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Tournaments */}
              <div className="card">
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
                  🔥 Top 10 Tournaments by Views
                </h3>
                {stats.topTournaments.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>No data yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {stats.topTournaments.map((t, idx) => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--surface-elevated)", borderRadius: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span style={{ fontWeight: 700, color: "var(--primary)", minWidth: "30px" }}>#{idx + 1}</span>
                          <Link href={`/tournaments/${t.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>{t.name}</Link>
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{t.views} views</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Organizers Tab */}
          {activeTab === "organizers" && (
            <div>
              {/* Filters */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select className="form-select" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
                  <option value="all">All Tiers</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
                <select className="form-select" value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="verified">Verified Only</option>
                  <option value="unverified">Unverified Only</option>
                </select>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn" onClick={() => { setSearchTerm(""); setTierFilter("all"); setVerifiedFilter("all"); }} style={{ flex: 1 }}>
                    Clear
                  </button>
                  <Link href="/organizer/register" className="btn btn-primary" style={{ textDecoration: "none", flex: 1, textAlign: "center" }}>
                    + Add
                  </Link>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedOrganizers.length > 0 && (
                <div className="card" style={{ marginBottom: "1rem", padding: "1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", background: "var(--primary)", color: "white" }}>
                  <span style={{ fontWeight: 600 }}>{selectedOrganizers.length} selected</span>
                  <button onClick={handleBulkVerify} className="btn" style={{ background: "white", color: "var(--primary)", padding: "0.5rem 1rem" }}>
                    ✓ Verify All
                  </button>
                  <button onClick={handleBulkChangeTier} className="btn" style={{ background: "white", color: "var(--primary)", padding: "0.5rem 1rem" }}>
                    Change Tier
                  </button>
                  <button onClick={() => setSelectedOrganizers([])} className="btn" style={{ background: "transparent", border: "2px solid white", color: "white", padding: "0.5rem 1rem" }}>
                    Clear
                  </button>
                </div>
              )}

              <div className="table-container">
                <div className="table-wrapper">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-elevated)" }}>
                        <th style={{ padding: "1rem", width: "50px" }}>
                          <input 
                            type="checkbox" 
                            checked={selectedOrganizers.length === filteredOrganizers.length && filteredOrganizers.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrganizers(filteredOrganizers.map(o => o.id));
                              } else {
                                setSelectedOrganizers([]);
                              }
                            }}
                          />
                        </th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Name</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Email</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Tier</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Verified</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Stats</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrganizers.map((org, idx) => (
                        <tr 
                          key={org.id} 
                          style={{ 
                            borderBottom: "1px solid var(--border)",
                            background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)"
                          }}
                        >
                          <td style={{ padding: "1rem" }}>
                            <input 
                              type="checkbox" 
                              checked={selectedOrganizers.includes(org.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrganizers([...selectedOrganizers, org.id]);
                                } else {
                                  setSelectedOrganizers(selectedOrganizers.filter(id => id !== org.id));
                                }
                              }}
                            />
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <div style={{ fontWeight: 600 }}>{org.name}</div>
                            {org.organization && <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{org.organization}</div>}
                          </td>
                          <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{org.email}</td>
                          <td style={{ padding: "1rem" }}>
                            <select
                              className="form-select"
                              value={org.tier || "free"}
                              onChange={(e) => handleChangeTier(org.id, e.target.value)}
                              style={{ 
                                padding: "0.5rem", 
                                fontSize: "0.875rem",
                                background: org.tier === "premium" ? "#8b5cf6" : org.tier === "pro" ? "var(--primary)" : "var(--surface-elevated)",
                                color: org.tier === "premium" || org.tier === "pro" ? "white" : "var(--text-primary)",
                                border: "none",
                                borderRadius: "8px"
                              }}
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="premium">Premium</option>
                            </select>
                          </td>
                          <td style={{ padding: "1rem" }}>
                            {org.verified_badge ? (
                              <span className="badge" style={{ background: "var(--success)", color: "white" }}>✓ Verified</span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <div style={{ fontSize: "0.875rem" }}>
                              <span style={{ fontWeight: 600 }}>{org.total_tournaments_organized || 0}</span> tournaments
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                              <span style={{ fontWeight: 600 }}>{org.total_players_served || 0}</span> players
                            </div>
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <button
                                onClick={() => handleToggleVerified(org.id, org.verified_badge || false)}
                                className="btn"
                                style={{ padding: "0.4rem 0.6rem", fontSize: "0.75rem", background: org.verified_badge ? "var(--surface-elevated)" : "var(--success)", color: org.verified_badge ? "var(--text-primary)" : "white", border: "1px solid var(--border)" }}
                              >
                                {org.verified_badge ? "Unverify" : "Verify"}
                              </button>
                              <button
                                onClick={() => handleDeleteOrganizer(org.id)}
                                className="btn"
                                style={{ padding: "0.4rem 0.6rem", fontSize: "0.75rem", background: "var(--error)", color: "white", border: "none" }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {filteredOrganizers.length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "var(--text-secondary)" }}>No organizers found.</p>
                </div>
              )}
            </div>
          )}

          {/* Tournaments Tab */}
          {activeTab === "tournaments" && (
            <div>
              {/* Advanced Filters */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="completed">Completed</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                </select>
                <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  <option value="Rapid">Rapid</option>
                  <option value="Blitz">Blitz</option>
                  <option value="Classical">Classical</option>
                </select>
                <select className="form-select" value={fideFilter} onChange={(e) => setFideFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="fide">FIDE Only</option>
                  <option value="non-fide">Non-FIDE</option>
                </select>
                <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
                <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <button onClick={() => { setSearchTerm(""); setStatusFilter("all"); setCategoryFilter("all"); setFideFilter("all"); setDateFrom(""); setDateTo(""); }} className="btn">
                  Clear Filters
                </button>
                <button onClick={exportTournamentsCSV} className="btn" style={{ background: "var(--success)", color: "white" }}>
                  📊 Export CSV
                </button>
              </div>

              <div className="table-container">
                <div className="table-wrapper">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-elevated)" }}>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Tournament</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Organizer</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Date</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Status</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Players</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Views</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTournaments.map((t: any, idx) => (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)" }}>
                          <td style={{ padding: "1rem" }}>
                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              {t.category} {t.fide_rated && <span className="badge" style={{ background: "var(--accent)", color: "white", marginLeft: "0.5rem", fontSize: "0.625rem" }}>FIDE</span>}
                            </div>
                          </td>
                          <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            {t.organizers?.name || t.organizer_name || "-"}
                          </td>
                          <td style={{ padding: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{formatDate(t.date)}</td>
                          <td style={{ padding: "1rem" }}>
                            <span
                              className="badge"
                              style={{ 
                                background: t.status === "completed" ? "var(--success)" : t.status === "published" ? "var(--primary)" : "var(--surface-elevated)", 
                                color: t.status === "completed" || t.status === "published" ? "white" : "var(--text-primary)" 
                              }}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>
                            {t.final_player_count || "-"}
                          </td>
                          <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                            {tournamentAnalytics[t.id]?.views || 0}
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <select 
                              className="form-select" 
                              onChange={(e) => {
                                const action = e.target.value;
                                if (action === "set_players") handleSetPlayerCount(t.id, t.organizers?.id || t.organizer_id);
                                if (action === "mark_complete") handleChangeTournamentStatus(t.id, "completed");
                                if (action === "mark_published") handleChangeTournamentStatus(t.id, "published");
                                if (action === "view") router.push(`/tournaments/${t.id}`);
                                if (action === "delete") handleDeleteTournament(t.id);
                                e.target.value = "";
                              }}
                              style={{ padding: "0.5rem", fontSize: "0.875rem" }}
                              defaultValue=""
                            >
                              <option value="">Actions...</option>
                              <option value="set_players">Set Players</option>
                              <option value="mark_complete">Mark Complete</option>
                              <option value="mark_published">Mark Published</option>
                              <option value="view">View</option>
                              <option value="delete">Delete</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredTournaments.length === 0 && (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "var(--text-secondary)" }}>No tournaments found.</p>
                </div>
              )}
            </div>
          )}

          {/* Players Tab */}
          {activeTab === "players" && (
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ maxWidth: "400px" }}
                />
              </div>

              {filteredPlayers.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "var(--text-secondary)" }}>No players found.</p>
                </div>
              ) : (
                <div className="table-container">
                  <div className="table-wrapper">
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-elevated)" }}>
                          <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Name</th>
                          <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Email</th>
                          <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>FIDE ID</th>
                          <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Rating</th>
                          <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlayers.map((p, idx) => (
                          <tr key={p.id} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)" }}>
                            <td style={{ padding: "1rem", fontWeight: 600 }}>{p.name}</td>
                            <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{p.email}</td>
                            <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{p.fide_id || "-"}</td>
                            <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{p.rating || "-"}</td>
                            <td style={{ padding: "1rem" }}>
                              <button
                                onClick={() => handleDeletePlayer(p.id)}
                                className="btn"
                                style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", background: "var(--error)", color: "white", border: "none" }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && stats && (
            <div>
              {/* Stats Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>{stats.totalTournaments}</div>
                  <div style={{ color: "var(--text-secondary)" }}>Total Tournaments</div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>{stats.totalOrganizers}</div>
                  <div style={{ color: "var(--text-secondary)" }}>Total Organizers</div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>{stats.totalPlayers}</div>
                  <div style={{ color: "var(--text-secondary)" }}>Total Players</div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>{stats.totalViews}</div>
                  <div style={{ color: "var(--text-secondary)" }}>Total Views</div>
                </div>
              </div>

              {/* Detailed Analytics Table */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                  <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                    All Tournament Analytics
                  </h3>
                  <button
                    onClick={() => {
                      const csvContent = "Tournament,Organizer,Views,PDF Downloads,Registration Clicks,WhatsApp Clicks,Total\n" +
                        tournaments.map(t => {
                          const a = tournamentAnalytics[t.id] || { views: 0, pdf: 0, reg: 0, wa: 0 };
                          const total = a.views + a.pdf + a.reg + a.wa;
                          return `"${t.name}","${t.organizer_name || 'N/A'}",${a.views},${a.pdf},${a.reg},${a.wa},${total}`;
                        }).join("\n");
                      const blob = new Blob([csvContent], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "tournament_analytics.csv";
                      link.click();
                    }}
                    className="btn"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", background: "var(--success)", color: "white" }}
                  >
                    Export CSV
                  </button>
                </div>
                <div className="table-container">
                  <div className="table-wrapper">
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-elevated)" }}>
                          <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Tournament</th>
                          <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>Views</th>
                          <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>PDF</th>
                          <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>Reg</th>
                          <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>WhatsApp</th>
                          <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournaments
                          .map(t => ({
                            ...t,
                            analytics: tournamentAnalytics[t.id] || { views: 0, pdf: 0, reg: 0, wa: 0 }
                          }))
                          .sort((a, b) => {
                            const totalA = a.analytics.views + a.analytics.pdf + a.analytics.reg + a.analytics.wa;
                            const totalB = b.analytics.views + b.analytics.pdf + b.analytics.reg + b.analytics.wa;
                            return totalB - totalA;
                          })
                          .map((t, idx) => {
                            const total = t.analytics.views + t.analytics.pdf + t.analytics.reg + t.analytics.wa;
                            return (
                              <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)" }}>
                                <td style={{ padding: "1rem" }}>
                                  <Link href={`/tournaments/${t.id}`} style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
                                    {t.name}
                                  </Link>
                                </td>
                                <td style={{ padding: "1rem", textAlign: "center" }}>{t.analytics.views}</td>
                                <td style={{ padding: "1rem", textAlign: "center" }}>{t.analytics.pdf}</td>
                                <td style={{ padding: "1rem", textAlign: "center" }}>{t.analytics.reg}</td>
                                <td style={{ padding: "1rem", textAlign: "center" }}>{t.analytics.wa}</td>
                                <td style={{ padding: "1rem", textAlign: "center", fontWeight: 700, color: "var(--primary)" }}>{total}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
