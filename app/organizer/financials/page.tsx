"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Organizer = {
  id: string;
  email: string;
  name: string;
  tier: string;
  auth_user_id: string;
};

type Tournament = {
  id: string;
  name: string;
  date: string;
  entry_fee: string;
  final_player_count: number | null;
  status: string;
  cost_breakdown: {
    venue: number;
    prizes: number;
    staff: number;
    equipment: number;
    marketing: number;
    other: number;
  } | null;
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

function TournamentFinancialCard({ tournament, onSave }: { tournament: Tournament; onSave: (id: string, costs: any) => void }) {
  const [costs, setCosts] = useState(tournament.cost_breakdown || {
    venue: 0, prizes: 0, staff: 0, equipment: 0, marketing: 0, other: 0
  });

  const entryFee = parseFloat(tournament.entry_fee?.replace(/[^0-9.]/g, '') || '0');
  const grossIncome = entryFee * (tournament.final_player_count || 0);
  const totalCosts = Object.values(costs).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0);
  const grossProfit = grossIncome - totalCosts;
  const tax = grossProfit > 0 ? grossProfit * 0.18 : 0;
  const netProfit = grossProfit - tax;

  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>{tournament.name}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{formatDate(tournament.date)}</p>
        </div>
        <span 
          className="badge" 
          style={{ background: tournament.status === "completed" ? "var(--success)" : "var(--primary)", color: "white" }}
        >
          {tournament.status === "completed" ? "Completed" : "Upcoming"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Entry Fee</div>
          <div style={{ fontWeight: 600 }}>{tournament.entry_fee || "Free"}</div>
        </div>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Players</div>
          <div style={{ fontWeight: 600 }}>{tournament.final_player_count || 0}</div>
        </div>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Gross Income</div>
          <div style={{ fontWeight: 600, color: "var(--primary)" }}>₹{grossIncome.toLocaleString()}</div>
        </div>
      </div>

      <hr style={{ margin: "1.5rem 0", border: "none", borderTop: "1px solid var(--border)" }} />

      <h4 style={{ marginBottom: "1rem", fontWeight: 600 }}>Cost Breakdown</h4>
      <div style={{ display: "grid", gap: "1rem" }}>
        {[
          { key: "venue", label: "Venue Rental" },
          { key: "prizes", label: "Prize Pool" },
          { key: "staff", label: "Staff Costs" },
          { key: "equipment", label: "Equipment" },
          { key: "marketing", label: "Marketing" },
          { key: "other", label: "Other" },
        ].map(({ key, label }) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "1rem", alignItems: "center" }}>
            <label style={{ color: "var(--text-secondary)" }}>{label}:</label>
            <input
              type="number"
              className="form-input"
              value={(costs as any)[key] || 0}
              onChange={(e) => setCosts({ ...costs, [key]: parseFloat(e.target.value) || 0 })}
              style={{ maxWidth: "200px" }}
            />
          </div>
        ))}
      </div>

      <button 
        onClick={() => onSave(tournament.id, costs)} 
        className="btn btn-primary" 
        style={{ marginTop: "1rem" }}
      >
        Save Costs
      </button>

      <hr style={{ margin: "1.5rem 0", border: "none", borderTop: "1px solid var(--border)" }} />

      <div style={{ display: "grid", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-secondary)" }}>Total Costs:</span>
          <strong>₹{totalCosts.toLocaleString()}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-secondary)" }}>Gross Profit:</span>
          <strong>₹{grossProfit.toLocaleString()}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text-secondary)" }}>Tax (18% GST):</span>
          <strong>₹{tax.toLocaleString()}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "2px solid var(--border)" }}>
          <span><strong>Net Profit:</strong></span>
          <strong style={{ color: netProfit >= 0 ? "var(--success)" : "var(--error)" }}>
            ₹{netProfit.toLocaleString()}
          </strong>
        </div>
      </div>
    </div>
  );
}

export default function FinancialsPage() {
  const router = useRouter();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
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
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/organizer/login");
          return;
        }

        const { data: org, error: orgError } = await supabase
          .from("organizers")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();

        if (orgError || !org) {
          router.push("/organizer/login");
          return;
        }

        setOrganizer(org as Organizer);

        if (org.tier !== "premium") {
          setLoading(false);
          return;
        }

        const { data: tourns } = await supabase
          .from("tournaments")
          .select("*")
          .eq("organizer_id", org.id)
          .eq("status", "completed")
          .order("date", { ascending: false });

        setTournaments((tourns || []) as Tournament[]);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  const handleSaveCosts = async (tournamentId: string, costs: any) => {
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ cost_breakdown: costs })
        .eq("id", tournamentId);

      if (error) throw error;
      alert("Costs saved!");
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to save costs");
    }
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/organizer/login");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  // Premium tier check
  if (organizer?.tier !== "premium") {
    return (
      <div style={{ background: "var(--background)", minHeight: "100vh" }}>
        <section className="hero-bg" style={{ minHeight: "25vh", display: "flex", flexDirection: "column" }}>
          <nav className="glass">
            <div className="nav-container">
              <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
                TourneyRadar
              </Link>
              <div className="nav-links">
                <Link href="/organizer/dashboard" style={{ textDecoration: "none" }}>Dashboard</Link>
                <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}>
                  Logout
                </button>
              </div>
            </div>
          </nav>
        </section>

        <section className="tournament-section">
          <div className="section-container">
            <div className="card" style={{ textAlign: "center", padding: "3rem", maxWidth: "600px", margin: "0 auto" }}>
              <h2 className="font-display" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Premium Feature</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Upgrade to Premium tier to access the Financial Dashboard
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                Premium includes: Unlimited tournaments, advanced analytics, financial tracking, and more.
              </p>
              <a href="mailto:dhawansanay@gmail.com?subject=TourneyRadar Premium Upgrade" className="btn btn-primary">
                Contact to Upgrade
              </a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Calculate totals
  const totalGrossIncome = tournaments.reduce((sum, t) => {
    const fee = parseFloat(t.entry_fee?.replace(/[^0-9.]/g, '') || '0');
    return sum + (fee * (t.final_player_count || 0));
  }, 0);

  const totalCosts = tournaments.reduce((sum, t) => {
    if (!t.cost_breakdown) return sum;
    const costs = t.cost_breakdown;
    return sum + (costs.venue || 0) + (costs.prizes || 0) + (costs.staff || 0) + 
           (costs.equipment || 0) + (costs.marketing || 0) + (costs.other || 0);
  }, 0);

  const grossProfit = totalGrossIncome - totalCosts;
  const tax = grossProfit > 0 ? grossProfit * 0.18 : 0;
  const netProfit = grossProfit - tax;

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-bg" style={{ minHeight: "25vh", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>
            <div className="nav-links">
              <Link href="/organizer/dashboard" style={{ textDecoration: "none" }}>Dashboard</Link>
              <Link href="/organizer/financials" style={{ textDecoration: "none", fontWeight: 600 }}>Financials</Link>
              
              {/* Theme Toggle */}
              <div className="theme-toggle">
                <button className={`theme-btn ${theme === "light" ? "active" : ""}`} onClick={() => handleThemeChange("light")}>Light</button>
                <button className={`theme-btn ${theme === "dark" ? "active" : ""}`} onClick={() => handleThemeChange("dark")}>Dark</button>
                <button className={`theme-btn ${theme === "system" ? "active" : ""}`} onClick={() => handleThemeChange("system")}>Auto</button>
              </div>
              
              <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}>
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
                <Link href="/organizer/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <Link href="/organizer/financials" onClick={() => setMobileMenuOpen(false)}>Financials</Link>
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

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Financial <span className="highlight">Dashboard</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container">
          {/* Overall Summary */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
              Financial Overview
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Total Gross Income</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)" }}>
                  ₹{totalGrossIncome.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Total Costs</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>₹{totalCosts.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Gross Profit</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>₹{grossProfit.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Net Profit (after 18% GST)</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: netProfit >= 0 ? "var(--success)" : "var(--error)" }}>
                  ₹{netProfit.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Tournament Cards */}
          <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
            Tournament Financials ({tournaments.length} completed)
          </h2>

          {tournaments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <p style={{ color: "var(--text-secondary)" }}>
                No completed tournaments yet. Financial data will appear here once tournaments are marked as completed.
              </p>
            </div>
          ) : (
            tournaments.map((tournament) => (
              <TournamentFinancialCard 
                key={tournament.id} 
                tournament={tournament} 
                onSave={handleSaveCosts}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
