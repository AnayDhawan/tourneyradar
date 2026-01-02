"use client";

import "leaflet/dist/leaflet.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useEffect, useState } from "react";

import { supabase, type Tournament } from "../../../lib/supabase";
import { trackEvent } from "../../../lib/analytics";
import { useAuth } from "../../../lib/AuthContext";
import { useToast } from "../../../components/Toast";
import Breadcrumbs from "../../../components/Breadcrumbs";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });

type Tab = "overview" | "prizes" | "venue" | "schedule" | "organizer";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function getCountdown(dateStr: string): string {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff < 0) return "Registration closed";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days} days ${hours} hours left`;
  if (hours > 0) return `${hours} hours left`;
  return "Closing soon";
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v12M9 9h6M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 9a6 6 0 0012 0M12 15v4M8 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Player = {
  id: string;
  name: string;
};

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: authUser, userType, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [similar, setSimilar] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  const [regStatus, setRegStatus] = useState<"pending" | "confirmed" | null>(null);

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
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (tournamentError || !tournamentData) {
        notFound();
        return;
      }

      setTournament(tournamentData as Tournament);

      // Track view event
      trackEvent(id, "view");

      // Check if player is logged in and their registration/favorite status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: playerData } = await supabase
          .from("players")
          .select("id, name")
          .eq("auth_user_id", user.id)
          .single();

        if (playerData) {
          setPlayer(playerData as Player);

          // Check registration status
          const { data: regData } = await supabase
            .from("player_registrations")
            .select("id")
            .eq("player_id", playerData.id)
            .eq("tournament_id", id)
            .single();
          setIsRegistered(!!regData);

          // Check favorite status
          const { data: favData } = await supabase
            .from("player_favorite_tournaments")
            .select("id")
            .eq("player_id", playerData.id)
            .eq("tournament_id", id)
            .single();
          setIsFavorited(!!favData);
        }
      }

      const { data: similarData } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "published")
        .neq("id", id)
        .or(`state.eq.${tournamentData.state},category.eq.${tournamentData.category}`)
        .limit(3);

      if (!cancelled) {
        setSimilar((similarData ?? []) as Tournament[]);
        setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleShare = (platform: "whatsapp" | "copy") => {
    const url = typeof window !== "undefined" ? window.location.href : "";

    if (platform === "whatsapp") {
      const text = `Check out this chess tournament: ${tournament?.name}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    } else {
      navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  const handleRegister = () => {
    if (tournament?.registration_link) {
      trackEvent(id, "registration_click");
      window.open(tournament.registration_link, "_blank");
    } else if (tournament?.whatsapp_group) {
      trackEvent(id, "whatsapp_click");
      window.open(tournament.whatsapp_group, "_blank");
    }
    // Show confirmation modal
    setShowRegModal(true);
  };

  const handleConfirmRegistration = async () => {
    if (!player) return;
    const { error } = await supabase.from("player_registrations").insert({
      player_id: player.id,
      tournament_id: id,
      status: "pending",
    });
    if (!error) {
      setIsRegistered(true);
      setRegStatus("pending");
    }
    setShowRegModal(false);
  };

  const handlePlayerUnregister = async () => {
    if (!player) return;
    const { error } = await supabase
      .from("player_registrations")
      .delete()
      .eq("player_id", player.id)
      .eq("tournament_id", id);
    if (!error) setIsRegistered(false);
  };

  const handleToggleFavorite = async () => {
    if (!player) return;
    if (isFavorited) {
      const { error } = await supabase
        .from("player_favorite_tournaments")
        .delete()
        .eq("player_id", player.id)
        .eq("tournament_id", id);
      if (!error) setIsFavorited(false);
    } else {
      const { error } = await supabase.from("player_favorite_tournaments").insert({
        player_id: player.id,
        tournament_id: id,
      });
      if (!error) setIsFavorited(true);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div className="loading-message">Loading tournament details...</div>
      </div>
    );
  }

  if (!tournament) {
    notFound();
    return null;
  }

  const countdown = getCountdown(tournament.date);

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-bg" style={{ minHeight: "60vh", position: "relative", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none" }}>Tournaments</Link>
              {!authLoading && (
                userType === "player" ? (
                  <Link href="/player/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>My Dashboard</Link>
                ) : userType === "organizer" ? (
                  <Link href="/organizer/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>Organizer Dashboard</Link>
                ) : userType === "admin" ? (
                  <Link href="/admin/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>Admin Panel</Link>
                ) : (
                  <Link href="/player/login" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", textDecoration: "none" }}>Player Login</Link>
                )
              )}
            </div>

            <button className="mobile-menu-btn" aria-label="Menu">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </nav>

        <div style={{ flex: 1, padding: "2rem", paddingTop: "3rem" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
              <Link href="/" className="btn" style={{ background: "rgba(255,255,255,0.2)", color: "white", display: "flex", alignItems: "center", gap: "0.5rem", border: "1px solid rgba(255,255,255,0.3)", textDecoration: "none" }}>
                <BackIcon />
                Back
              </Link>

              {(tournament.registration_link || tournament.whatsapp_group) && (
                <button onClick={handleRegister} className="btn btn-primary">
                  Register Now
                </button>
              )}
            </div>

            <h1 className="hero-title font-display" style={{ marginBottom: "1rem" }}>
              {tournament.name}
            </h1>

            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
              {tournament.fide_rated && <span className="badge badge-fide">FIDE Rated</span>}
              <span className="badge">{tournament.category}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <div>
                <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.25rem" }}>Date</div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "white" }}>{formatDate(tournament.date)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.25rem" }}>Location</div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "white" }}>{tournament.location}, {tournament.state}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.25rem" }}>Registration</div>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#F59E0B" }}>{countdown}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <button onClick={() => handleShare("whatsapp")} className="btn" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
                Share on WhatsApp
              </button>
              <a href={tournament.pdf} target="_blank" rel="noopener noreferrer" style={{color: "var(--text-primary)", textDecoration: "none"}}>
                <button className="btn" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
                  Download PDF
                </button>
              </a>
              <button onClick={() => handleShare("copy")} className="btn" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ color: "var(--primary)", marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
                <CalendarIcon />
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Date</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>{formatDate(tournament.date)}</div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ color: "var(--primary)", marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
                <LocationIcon />
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Location</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>{tournament.location}</div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ color: "var(--primary)", marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
                <MoneyIcon />
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Entry Fee</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>{tournament.entry_fee}</div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ color: "var(--primary)", marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
                <TrophyIcon />
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Prize Pool</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>{tournament.prize_pool}</div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ color: "var(--primary)", marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
                <ClockIcon />
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Format</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>{tournament.format}</div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ color: "var(--primary)", marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
                <StarIcon />
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Rounds</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>{tournament.rounds}</div>
            </div>
          </div>

          {/* Player Actions Card */}
          {player ? (
            <div className="card" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Logged in as </span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{player.name}</span>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  onClick={handleToggleFavorite}
                  className="btn"
                  style={{ 
                    background: isFavorited ? "var(--primary)" : "var(--surface-elevated)", 
                    color: isFavorited ? "white" : "var(--text-primary)",
                    border: isFavorited ? "none" : "2px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  {isFavorited ? "In Wishlist" : "Add to Wishlist"}
                </button>
                {isRegistered ? (
                  <button onClick={handlePlayerUnregister} className="btn" style={{ background: "var(--success)", color: "white", border: "none" }}>
                    ✓ Registered - Click to Cancel
                  </button>
                ) : (
                  <button onClick={handleRegister} className="btn btn-primary">
                    Register for Tournament
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Sign in to register and save favorites</span>
              <Link href="/player/login" className="btn btn-primary" style={{ textDecoration: "none" }}>
                Player Login
              </Link>
            </div>
          )}

          <div className="card">
            <div className="view-toggle" style={{ marginBottom: "2rem" }}>
              <button type="button" className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>
                Overview
              </button>
              <button type="button" className={activeTab === "prizes" ? "active" : ""} onClick={() => setActiveTab("prizes")}>
                Prizes
              </button>
              <button type="button" className={activeTab === "venue" ? "active" : ""} onClick={() => setActiveTab("venue")}>
                Venue
              </button>
              <button type="button" className={activeTab === "schedule" ? "active" : ""} onClick={() => setActiveTab("schedule")}>
                Schedule
              </button>
              <button type="button" className={activeTab === "organizer" ? "active" : ""} onClick={() => setActiveTab("organizer")}>
                Organizer
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "overview" && (
                <div>
                  <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                    About Tournament
                  </h2>
                  <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: "2rem" }}>
                    {tournament.description}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "1rem", marginBottom: "2rem" }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Time Control:</div>
                    <div style={{ color: "var(--text-secondary)" }}>{tournament.time_control}</div>

                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Format:</div>
                    <div style={{ color: "var(--text-secondary)" }}>{tournament.format}</div>

                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Rounds:</div>
                    <div style={{ color: "var(--text-secondary)" }}>{tournament.rounds}</div>
                  </div>

                  {tournament.rules && tournament.rules.length > 0 && (
                    <>
                      <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
                        Rules & Regulations
                      </h3>
                      <ul style={{ color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: "1.5rem" }}>
                        {tournament.rules.map((rule, idx) => (
                          <li key={idx} style={{ marginBottom: "0.5rem" }}>{rule}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {activeTab === "prizes" && (
                <div>
                  <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "2rem", color: "var(--text-primary)" }}>
                    Prize Distribution
                  </h2>
                  
                  {/* Total Prize Pool Banner */}
                  <div style={{
                    textAlign: "center",
                    padding: "2.5rem",
                    background: "linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)",
                    borderRadius: "16px",
                    marginBottom: "2.5rem",
                    boxShadow: "0 8px 24px rgba(99, 102, 241, 0.2)"
                  }}>
                    <p style={{ 
                      fontSize: "0.875rem", 
                      color: "rgba(255, 255, 255, 0.9)", 
                      marginBottom: "0.5rem",
                      textTransform: "uppercase",
                      letterSpacing: "1.5px",
                      fontWeight: 600
                    }}>
                      Total Prize Pool
                    </p>
                    <h2 style={{ 
                      fontSize: "3.5rem", 
                      fontWeight: 800, 
                      color: "white",
                      margin: 0,
                      textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)"
                    }}>
                      {tournament.prize_pool}
                    </h2>
                  </div>

                  {/* Prize Display - Handles both flat and nested structures */}
                  {tournament.prize_distribution && typeof tournament.prize_distribution === 'object' && (() => {
                    const prizeData = tournament.prize_distribution;
                    
                    // Check if this is a nested structure (has category wrappers)
                    const hasCategories = Object.keys(prizeData).some(key => 
                      typeof prizeData[key] === 'object' && 
                      !key.match(/^\d/) && 
                      key.includes('_')
                    );

                    if (hasCategories) {
                      // NESTED STRUCTURE: Has category wrappers (Open_Prizes, Female_Prizes, etc.)
                      return (
                        <div style={{ display: "grid", gap: "1.5rem" }}>
                          {Object.entries(prizeData)
                            .filter(([category, prizes]) => {
                              // Hide empty categories
                              if (!prizes) return false;
                              if (typeof prizes === 'object' && Object.keys(prizes).length === 0) return false;
                              return true;
                            })
                            .map(([category, prizes]) => (
                            <div 
                              key={category}
                              style={{
                                background: "var(--surface-elevated)",
                                padding: "1.5rem",
                                borderRadius: "12px",
                                border: "2px solid var(--border)"
                              }}
                            >                           
                              <h4 style={{ 
                                fontSize: "1.25rem", 
                                fontWeight: 700, 
                                color: "var(--text-primary)",
                                marginBottom: "1rem",
                                textTransform: "capitalize",
                                borderBottom: "2px solid var(--border)",
                                paddingBottom: "0.75rem"
                              }}>
                                {category.replace(/_/g, " ")}
                              </h4>
                              
                              {typeof prizes === 'object' && prizes !== null ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                  {Object.entries(prizes as Record<string, any>).map(([position, amount]) => {
                                    // Check if amount is itself an object (triple nesting case)
                                    const isNestedObject = typeof amount === 'object' && amount !== null;
                                    
                                    return (
                                      <div key={position} style={{ marginBottom: isNestedObject ? "1rem" : "0" }}>
                                        {isNestedObject ? (
                                          // Triple nesting: show sub-category with its prizes
                                          <div>
                                            <div style={{
                                              fontSize: "0.875rem",
                                              fontWeight: 600,
                                              color: "var(--text-primary)",
                                              marginBottom: "0.5rem",
                                              paddingLeft: "1rem",
                                              borderLeft: "3px solid var(--primary)"
                                            }}>
                                              {position.replace(/_/g, " ")}
                                            </div>
                                            <div style={{ paddingLeft: "1rem" }}>
                                              {Object.entries(amount as Record<string, any>).map(([subPos, subAmount]) => (
                                                <div
                                                  key={subPos}
                                                  style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "0.625rem 1rem",
                                                    background: "var(--surface)",
                                                    borderRadius: "8px",
                                                    border: "1px solid var(--border)",
                                                    marginBottom: "0.5rem"
                                                  }}
                                                >
                                                  <span style={{
                                                    color: "var(--text-secondary)",
                                                    fontSize: "0.875rem",
                                                    fontWeight: 500
                                                  }}>
                                                    {subPos === 'description' ? '📋' : '🏆'} {subPos.replace(/_/g, " ")}
                                                  </span>
                                                  <span style={{
                                                    color: "var(--primary)",
                                                    fontWeight: 700,
                                                    fontSize: "1rem"
                                                  }}>
                                                    {String(subAmount)}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ) : (
                                          // Normal case: just show position and amount
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              padding: "0.875rem 1rem",
                                              background: "var(--surface)",
                                              borderRadius: "8px",
                                              border: "1px solid var(--border)"
                                            }}
                                          >
                                            <span style={{
                                              color: "var(--text-secondary)",
                                              fontSize: "0.9375rem",
                                              fontWeight: 500
                                            }}>
                                              {position === 'description' ? '📋' : '🏆'} {position.replace(/_/g, " ")}
                                            </span>
                                            <span style={{
                                              color: "var(--primary)",
                                              fontWeight: 700,
                                              fontSize: "1.0625rem"
                                            }}>
                                              {String(amount)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p style={{ color: "var(--text-secondary)" }}>{String(prizes)}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      // FLAT STRUCTURE: Just positions (1st, 2nd, 3rd, etc.)
                      return (
                        <div style={{
                          background: "var(--surface-elevated)",
                          padding: "1.5rem",
                          borderRadius: "12px",
                          border: "2px solid var(--border)"
                        }}>
                          <h4 style={{ 
                            fontSize: "1.25rem", 
                            fontWeight: 700, 
                            color: "var(--text-primary)",
                            marginBottom: "1rem",
                            borderBottom: "2px solid var(--border)",
                            paddingBottom: "0.75rem"
                          }}>
                            Prize Breakdown
                          </h4>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {Object.entries(prizeData).map(([position, amount]) => (
                              <div 
                                key={position}
                                style={{ 
                                  display: "flex", 
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "0.875rem 1rem",
                                  background: "var(--surface)",
                                  borderRadius: "8px",
                                  border: "1px solid var(--border)"
                                }}
                              >
                                <span style={{ 
                                  color: "var(--text-secondary)",
                                  fontSize: "0.9375rem",
                                  fontWeight: 500
                                }}>
                                  🏆 {position.replace(/_/g, " ")}
                                </span>
                                <span style={{ 
                                  color: "var(--primary)", 
                                  fontWeight: 700,
                                  fontSize: "1.0625rem"
                                }}>
                                  {String(amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
              
              {activeTab === "venue" && (
                <div>
                  <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                    Venue Details
                  </h2>

                  <div style={{ marginBottom: "2rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                      {tournament.venue_name}
                    </div>
                    <div style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      {tournament.venue_address}
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tournament.venue_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ textDecoration: "none" }}
                    >
                      Open in Google Maps
                    </a>
                  </div>

                  {Number.isFinite(tournament.lat) && Number.isFinite(tournament.lng) && (
                    <div style={{ height: "400px", borderRadius: "16px", overflow: "hidden", marginBottom: "2rem" }}>
                      <MapContainer center={[tournament.lat, tournament.lng]} zoom={15} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[tournament.lat, tournament.lng]} />
                      </MapContainer>
                    </div>
                  )}

                  {tournament.amenities && tournament.amenities.length > 0 && (
                    <>
                      <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
                        Amenities
                      </h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        {tournament.amenities.map((amenity, idx) => (
                          <span key={idx} className="badge" style={{ background: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "schedule" && (
                <div>
                  <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                    Tournament Schedule
                  </h2>

                  {tournament.schedule && tournament.schedule.length > 0 ? (
                    <div style={{ display: "grid", gap: "1rem" }}>
                      {tournament.schedule.map((item: any, idx: number) => (
                        <div key={idx} style={{ padding: "1.5rem", background: "var(--surface-elevated)", borderRadius: "12px", borderLeft: "4px solid var(--primary)" }}>
                          <div style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                            {item.round || `Round ${idx + 1}`}
                          </div>
                          <div style={{ color: "var(--text-secondary)" }}>
                            {item.time || item.date || "Time TBA"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      Schedule will be announced soon
                    </div>
                  )}
                </div>
              )}

              {activeTab === "organizer" && (
                <div>
                  <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                    Organizer Information
                  </h2>

                  <div style={{ marginBottom: "2rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "1rem" }}>
                      {tournament.organizer_name}
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                      {tournament.organizer_phone && (
                        <a href={`tel:${tournament.organizer_phone}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
                          📞 Call Organizer
                        </a>
                      )}

                      {tournament.organizer_email && (
                        <a href={`mailto:${tournament.organizer_email}`} className="btn" style={{ background: "var(--surface-elevated)", border: "2px solid var(--border)", color: "var(--text-primary)", textDecoration: "none" }}>
                          ✉️ Email
                        </a>
                      )}

                      {tournament.whatsapp_group && (
                        <a href={tournament.whatsapp_group} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: "#25D366", color: "white", textDecoration: "none" }}>
                          WhatsApp Group
                        </a>
                      )}

                      {tournament.pdf && (
                        <a href={tournament.pdf} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: "var(--surface-elevated)", border: "2px solid var(--border)", color: "var(--text-primary)", textDecoration: "none" }}>
                          📄 Download PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {similar.length > 0 && (
            <>
              <h2 className="section-title font-display" style={{ marginTop: "4rem", marginBottom: "2rem" }}>
                Similar Tournaments
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                {similar.map((t) => (
                  <div key={t.id} className="card">
                    <div style={{ marginBottom: "1rem" }}>
                      <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                        {t.name}
                      </h3>
                      {t.fide_rated && <span className="badge badge-fide" style={{ marginRight: "0.5rem" }}>FIDE</span>}
                      <span className="badge">{t.category}</span>
                    </div>

                    <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      📍 {t.location}, {t.state}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                      📅 {formatDate(t.date)}
                    </div>

                    <Link href={`/tournaments/${t.id}`} className="btn btn-primary" style={{ width: "100%", textDecoration: "none" }}>
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Registration Confirmation Modal */}
      {showRegModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div className="card" style={{ maxWidth: "450px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
            <h3 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
              Confirm Registration
            </h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Have you completed the registration form that just opened?
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={handleConfirmRegistration}
                className="btn btn-primary"
              >
                Yes, I've Registered
              </button>
              <button
                onClick={() => setShowRegModal(false)}
                className="btn"
                style={{ background: "var(--surface-elevated)", border: "2px solid var(--border)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "1rem" }}>
              Your registration will be marked as pending until confirmed by the organizer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}