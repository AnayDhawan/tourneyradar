"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, type Tournament } from "../../../lib/supabase";
import Footer from "../../../components/Footer";

type Tab = "overview" | "scraper" | "tournaments" | "players" | "analytics";

type Player = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  fide_id: string | null;
  rating: number | null;
  created_at: string;
};

type ScrapeLog = {
  id: string;
  source: string;
  tournaments_found: number;
  tournaments_saved: number;
  errors: number;
  scraped_at: string;
};

type UngeocodedTournament = {
  id: string;
  name: string;
  location: string;
  country: string;
};

type Stats = {
  totalTournaments: number;
  totalPlayers: number;
  totalViews: number;
  bySource: Record<string, number>;
  byCountry: Record<string, number>;
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

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [scrapeLogs, setScrapeLogs] = useState<ScrapeLog[]>([]);
  const [ungeocodedTournaments, setUngeocodedTournaments] = useState<UngeocodedTournament[]>([]);
  const [tournamentAnalytics, setTournamentAnalytics] = useState<Record<string, { views: number; pdf: number; reg: number; wa: number }>>({});
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fideFilter, setFideFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  
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

        const [tournamentsRes, playersRes, analyticsRes, scrapeLogsRes, ungeocodedRes] = await Promise.all([
          supabase.from("tournaments").select("*").order("date", { ascending: false }),
          supabase.from("players").select("*").order("created_at", { ascending: false }),
          supabase.from("tournament_analytics").select("tournament_id, event_type"),
          supabase.from("scrape_logs").select("*").order("scraped_at", { ascending: false }).limit(10),
          supabase.from("tournaments").select("id, name, location, country").or("lat.is.null,lng.is.null").limit(20),
        ]);

        setTournaments((tournamentsRes.data ?? []) as Tournament[]);
        setPlayers((playersRes.data ?? []) as Player[]);
        setScrapeLogs((scrapeLogsRes.data ?? []) as ScrapeLog[]);
        setUngeocodedTournaments((ungeocodedRes.data ?? []) as UngeocodedTournament[]);

        const tournList = (tournamentsRes.data ?? []) as Tournament[];
        const playerList = (playersRes.data ?? []) as Player[];
        const analyticsList = analyticsRes.data ?? [];

        const bySource: Record<string, number> = {};
        const byCountry: Record<string, number> = {};
        for (const t of tournList) {
          const source = (t as any).source || 'manual';
          bySource[source] = (bySource[source] || 0) + 1;
          const country = (t as any).country_code || (t as any).country || 'Unknown';
          byCountry[country] = (byCountry[country] || 0) + 1;
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
          totalPlayers: playerList.length,
          totalViews,
          bySource,
          byCountry,
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

  async function handleDeleteTournament(id: string) {
    if (!confirm("Delete this tournament?")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (!error) setTournaments(tournaments.filter((t) => t.id !== id));
  }

  async function handleDeletePlayer(id: string) {
    if (!confirm("Delete this player?")) return;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (!error) setPlayers(players.filter((p) => p.id !== id));
  }

  const filteredTournaments = tournaments.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesFide = fideFilter === "all" || 
      (fideFilter === "fide" && t.fide_rated) ||
      (fideFilter === "non-fide" && !t.fide_rated);
    const matchesSource = sourceFilter === "all" || t.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesFide && matchesSource;
  });

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div className="loading-message">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-bg" style={{ minHeight: "15vh", display: "flex", flexDirection: "column" }}>
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
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
          </div>
        </nav>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <h1 className="font-display" style={{ color: "white", fontSize: "1.75rem", fontWeight: 700 }}>
            Admin Dashboard
          </h1>
        </div>
      </section>

      {mobileMenuOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-drawer">
            <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)}>x</button>
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

      <section className="tournament-section" style={{ paddingTop: "2rem" }}>
        <div className="section-container">
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            <button className={`btn ${activeTab === "overview" ? "btn-primary" : ""}`} onClick={() => setActiveTab("overview")} style={{ padding: "0.75rem 1.25rem" }}>
              Overview
            </button>
            <button className={`btn ${activeTab === "scraper" ? "btn-primary" : ""}`} onClick={() => setActiveTab("scraper")} style={{ padding: "0.75rem 1.25rem" }}>
              Scraper
            </button>
            <button className={`btn ${activeTab === "tournaments" ? "btn-primary" : ""}`} onClick={() => { setActiveTab("tournaments"); setSearchTerm(""); }} style={{ padding: "0.75rem 1.25rem" }}>
              Tournaments ({tournaments.length})
            </button>
            <button className={`btn ${activeTab === "players" ? "btn-primary" : ""}`} onClick={() => { setActiveTab("players"); setSearchTerm(""); }} style={{ padding: "0.75rem 1.25rem" }}>
              Players ({players.length})
            </button>
            <button className={`btn ${activeTab === "analytics" ? "btn-primary" : ""}`} onClick={() => setActiveTab("analytics")} style={{ padding: "0.75rem 1.25rem" }}>
              Analytics
            </button>
          </div>

          {activeTab === "overview" && stats && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)", color: "white" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800 }}>{stats.totalTournaments}</div>
                  <div style={{ opacity: 0.9 }}>Total Tournaments</div>
                </div>
                <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800 }}>{stats.totalPlayers}</div>
                  <div style={{ opacity: 0.9 }}>Registered Players</div>
                </div>
                <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", color: "white" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800 }}>{stats.totalViews}</div>
                  <div style={{ opacity: 0.9 }}>Total Views</div>
                </div>
                <div className="card" style={{ textAlign: "center", padding: "2rem", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800 }}>{Object.keys(stats.byCountry).length}</div>
                  <div style={{ opacity: 0.9 }}>Countries</div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: "2rem" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>Tournaments by Source</h3>
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                  {Object.entries(stats.bySource).map(([source, count]) => (
                    <div key={source} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--primary)" }}>{count}</div>
                      <div style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>{source}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ marginBottom: "2rem" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>Top Countries</h3>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([country, count]) => (
                    <div key={country} style={{ padding: "0.5rem 1rem", background: "var(--surface-elevated)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 600 }}>{country}</span>
                      <span style={{ color: "var(--text-muted)" }}>({count})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Top 10 Tournaments by Views</h3>
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

          {activeTab === "scraper" && (
            <div>
              <div className="card" style={{ marginBottom: "2rem" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>How to Run Scraper</h3>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.7 }}>
                  The scraper runs locally on your computer. Open a terminal in your project directory and run:
                </p>
                <code style={{ display: "block", background: "var(--surface-elevated)", padding: "1rem", borderRadius: "8px", fontFamily: "monospace", color: "var(--primary)", marginBottom: "1rem" }}>
                  npm run scrape
                </code>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  This will scrape Chess-Results.com and save tournaments to the database. Run it periodically to keep tournaments updated.
                </p>
              </div>

              <div className="card" style={{ marginBottom: "2rem" }}>
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Recent Scrape Logs</h3>
                {scrapeLogs.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>No scrape logs yet. Run the scraper to see results here.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--surface-elevated)" }}>
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>Source</th>
                          <th style={{ padding: "0.75rem", textAlign: "center" }}>Found</th>
                          <th style={{ padding: "0.75rem", textAlign: "center" }}>Saved</th>
                          <th style={{ padding: "0.75rem", textAlign: "center" }}>Errors</th>
                          <th style={{ padding: "0.75rem", textAlign: "left" }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scrapeLogs.map((log, idx) => (
                          <tr key={log.id} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)" }}>
                            <td style={{ padding: "0.75rem", fontWeight: 600 }}>{log.source}</td>
                            <td style={{ padding: "0.75rem", textAlign: "center" }}>{log.tournaments_found}</td>
                            <td style={{ padding: "0.75rem", textAlign: "center", color: "var(--success)" }}>{log.tournaments_saved}</td>
                            <td style={{ padding: "0.75rem", textAlign: "center", color: log.errors > 0 ? "var(--error)" : "var(--text-muted)" }}>{log.errors}</td>
                            <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>{formatDateTime(log.scraped_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {ungeocodedTournaments.length > 0 && (
                <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
                  <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "var(--accent)" }}>
                    Tournaments Missing Coordinates ({ungeocodedTournaments.length})
                  </h3>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    These tournaments won't appear on the map until their locations are geocoded.
                  </p>
                  <div style={{ maxHeight: "300px", overflow: "auto" }}>
                    {ungeocodedTournaments.map((t) => (
                      <div key={t.id} style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</div>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{t.location}, {t.country}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "tournaments" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <input type="text" className="form-input" placeholder="Search tournaments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="form-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                  <option value="all">All Sources</option>
                  <option value="chess-results">Chess-Results</option>
                  <option value="manual">Manual</option>
                </select>
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="completed">Completed</option>
                </select>
                <select className="form-select" value={fideFilter} onChange={(e) => setFideFilter(e.target.value)}>
                  <option value="all">All Ratings</option>
                  <option value="fide">FIDE Rated</option>
                  <option value="non-fide">Non-FIDE</option>
                </select>
              </div>

              <div className="card">
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-elevated)" }}>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Tournament</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Location</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Date</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Source</th>
                        <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>FIDE</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTournaments.slice(0, 50).map((t: any, idx) => (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)" }}>
                          <td style={{ padding: "1rem" }}>
                            <Link href={`/tournaments/${t.id}`} style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
                              {t.name.length > 40 ? t.name.substring(0, 40) + '...' : t.name}
                            </Link>
                          </td>
                          <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{t.location}, {t.country_code || t.country || ''}</td>
                          <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{formatDate(t.date)}</td>
                          <td style={{ padding: "1rem" }}>
                            <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", background: t.source === 'chess-results' ? 'var(--primary)' : 'var(--surface-elevated)', color: t.source === 'chess-results' ? 'white' : 'var(--text-primary)' }}>
                              {t.source || 'manual'}
                            </span>
                          </td>
                          <td style={{ padding: "1rem", textAlign: "center" }}>{t.fide_rated ? 'Yes' : 'No'}</td>
                          <td style={{ padding: "1rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              {t.source_url && (
                                <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Source</a>
                              )}
                              <button onClick={() => handleDeleteTournament(t.id)} className="btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "var(--error)", color: "white", border: "none" }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredTournaments.length > 50 && (
                  <p style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)" }}>Showing 50 of {filteredTournaments.length} tournaments</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "players" && (
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <input type="text" className="form-input" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ maxWidth: "400px" }} />
              </div>
              {filteredPlayers.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "var(--text-secondary)" }}>No players found.</p>
                </div>
              ) : (
                <div className="card">
                  <div style={{ overflowX: "auto" }}>
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
                              <button onClick={() => handleDeletePlayer(p.id)} className="btn" style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", background: "var(--error)", color: "white", border: "none" }}>Delete</button>
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

          {activeTab === "analytics" && stats && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>{stats.totalTournaments}</div>
                  <div style={{ color: "var(--text-secondary)" }}>Total Tournaments</div>
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

              <div className="card">
                <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Tournament Analytics</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-elevated)" }}>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: 600 }}>Tournament</th>
                        <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>Views</th>
                        <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>PDF</th>
                        <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>Registrations</th>
                        <th style={{ padding: "1rem", textAlign: "center", fontWeight: 600 }}>WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournaments
                        .map(t => ({ ...t, analytics: tournamentAnalytics[t.id] || { views: 0, pdf: 0, reg: 0, wa: 0 } }))
                        .sort((a, b) => b.analytics.views - a.analytics.views)
                        .slice(0, 20)
                        .map((t, idx) => (
                          <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "var(--surface)" : "var(--surface-elevated)" }}>
                            <td style={{ padding: "1rem" }}>
                              <Link href={`/tournaments/${t.id}`} style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>{t.name}</Link>
                            </td>
                            <td style={{ padding: "1rem", textAlign: "center" }}>{t.analytics.views}</td>
                            <td style={{ padding: "1rem", textAlign: "center" }}>{t.analytics.pdf}</td>
                            <td style={{ padding: "1rem", textAlign: "center" }}>{t.analytics.reg}</td>
                            <td style={{ padding: "1rem", textAlign: "center" }}>{t.analytics.wa}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
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