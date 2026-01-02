"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase, type Tournament } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import Footer from "../components/Footer";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const MarkerClusterGroup = dynamic(
  () => import("react-leaflet-cluster").then((m) => m.default as unknown as React.ComponentType<any>),
  { ssr: false },
);

type MapView = "mumbai" | "india";

type FilterState = {
  search: string;
  category: string;
  maxEntryFee: string;
  state: string;
  fideRated: "all" | "yes" | "no";
  startDate: string;
  endDate: string;
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

function normalizeString(v: unknown): string {
  return String(v ?? "").trim();
}

function parseEntryFee(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function isWithinDateRange(dateStr: string, start: string, end: string): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  const startD = start ? new Date(start) : null;
  const endD = end ? new Date(end) : null;
  if (startD && !Number.isNaN(startD.getTime()) && d < startD) return false;
  if (endD && !Number.isNaN(endD.getTime())) {
    const inclusiveEnd = new Date(endD);
    inclusiveEnd.setHours(23, 59, 59, 999);
    if (d > inclusiveEnd) return false;
  }
  return true;
}

function KnightSvg() {
  return (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" fill="white"/>
        <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" fill="white"/>
        <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill="black"/>
        <path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill="black"/>
      </g>
    </svg>
  );
}

export default function HomePage() {
  const { user, userType, loading: authLoading } = useAuth();
  const [mapView, setMapView] = useState<MapView>("mumbai");
  
  // ========== MOBILE MENU STATE - THIS IS THE FIX ==========
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "All",
    maxEntryFee: "",
    state: "All",
    fideRated: "all",
    startDate: "",
    endDate: "",
  });

  const [markerIcon, setMarkerIcon] = useState<import("leaflet").DivIcon | null>(null);

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

  // ========== LOCK BODY SCROLL WHEN MENU OPEN ==========
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function setupMarkerIcon() {
      const L = await import("leaflet");
      const icon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="position: relative; width: 40px; height: 40px;">
            <div style="position: absolute; width: 40px; height: 40px; background: #2563EB; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);"></div>
            <svg style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px;" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      });
      if (!cancelled) setMarkerIcon(icon);
    }

    setupMarkerIcon();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchTournaments() {
      setLoading(true);
      setError(null);

      const { data, error: qErr } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "published")
        .order("date", { ascending: true });
      
      // Filter to only show upcoming tournaments (date >= today)
      const today = new Date().toISOString().split('T')[0];
      const upcomingTournaments = data?.filter(t => t.date >= today) || [];

      if (cancelled) return;

      if (qErr) {
        setError(qErr.message);
        setTournaments([]);
        setLoading(false);
        return;
      }

      setTournaments(upcomingTournaments as Tournament[]); // ← CHANGED: Use upcomingTournaments instead of data
      setLoading(false);
    }

    fetchTournaments();
    return () => {
      cancelled = true;
    };
  }, []);

  const states = useMemo(() => {
    const unique = new Set(
      tournaments
        .map((t) => normalizeString(t.state))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    );
    return ["All", ...Array.from(unique)];
  }, [tournaments]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const maxFee = filters.maxEntryFee.trim() ? Number(filters.maxEntryFee) : null;

    return tournaments.filter((t) => {
      const name = normalizeString(t.name);
      const category = normalizeString(t.category);
      const st = normalizeString(t.state);
      const location = normalizeString(t.location);

      if (search) {
        const hay = `${name} ${location} ${st} ${t.id}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }

      if (filters.category !== "All" && category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }

      if (filters.state !== "All" && st.toLowerCase() !== filters.state.toLowerCase()) {
        return false;
      }

      if (filters.fideRated === "yes" && !t.fide_rated) return false;
      if (filters.fideRated === "no" && t.fide_rated) return false;

      if (!isWithinDateRange(t.date, filters.startDate, filters.endDate)) return false;

      if (maxFee !== null && Number.isFinite(maxFee)) {
        const fee = parseEntryFee(t.entry_fee);
        if (fee > maxFee) return false;
      }

      return true;
    });
  }, [filters, tournaments]);

  const mapConfig = useMemo(() => {
    if (mapView === "mumbai") {
      return { center: [19.076, 72.8777] as [number, number], zoom: 11 };
    }
    return { center: [22.9734, 78.6569] as [number, number], zoom: 5 };
  }, [mapView]);

  // Helper to get dashboard link
  const getDashboardLink = () => {
    if (userType === "player") return { href: "/player/dashboard", label: "My Dashboard" };
    if (userType === "organizer") return { href: "/organizer/dashboard", label: "Organizer Dashboard" };
    if (userType === "admin") return { href: "/admin/dashboard", label: "Admin Panel" };
    return { href: "/player/login", label: "Player Login" };
  };

  const dashboard = getDashboardLink();

  return (
    <>
      {/* ========== MOBILE MENU OVERLAY - THIS IS THE FIX ========== */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-brand font-display">TourneyRadar</span>
              <button 
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
            <nav className="mobile-drawer-nav">
              <Link href="/tournaments" onClick={() => setMobileMenuOpen(false)}>
                Tournaments
              </Link>
              <Link href="/tournaments/completed" onClick={() => setMobileMenuOpen(false)}>
                Completed Events
              </Link>
              {!authLoading && (
                <Link 
                  href={dashboard.href} 
                  className="mobile-drawer-cta"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {dashboard.label}
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}

      <section className="hero-bg">
        <nav className="glass">
          <div className="nav-container">
            <a href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </a>

            <div className="nav-links">
              <a href="/tournaments">Tournaments</a>
              <a href="/tournaments/completed">Completed Events</a>
              {!authLoading && (
                userType === "player" ? (
                  <a href="/player/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>My Dashboard</a>
                ) : userType === "organizer" ? (
                  <a href="/organizer/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Organizer Dashboard</a>
                ) : userType === "admin" ? (
                  <a href="/admin/dashboard" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Admin Panel</a>
                ) : (
                  <a href="/player/login" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Player Login</a>
                )
              )}
            </div>

            {/* ========== HAMBURGER BUTTON WITH onClick - THIS IS THE FIX ========== */}
            <button 
              className="mobile-menu-btn" 
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </nav>

        <div className="hero-content-wrapper">
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title font-display">
                Find Chess <span className="highlight">Tournaments <br />in India</span>
              </h1>

              <p className="hero-description">
                Discover, register, and compete in chess tournaments across India. Connect with players,
                track ratings, and elevate your game.
              </p>

              <div className="btn-group">
                <a href="/tournaments" className="btn btn-primary">
                  Explore Tournaments
                </a>
                {!authLoading && !user && (
                  <a href="/player/register" className="btn btn-outline">
                    Create Free Account 
                  </a>
                )}
              </div>

              <div className="stats-container" aria-label="Site statistics">
                <div className="stat-item">
                  <div className="stat-number">100+</div>
                  <div className="stat-label">Active Players</div> 
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <div className="stat-number">50+</div>
                  <div className="stat-label">Events</div>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <div className="stat-number">25+</div>
                  <div className="stat-label">Cities Covered</div>
                </div>
              </div>
            </div>
          </div>

          <div className="chess-knight" style={{
            position: 'absolute',
            right: '10%',
            bottom: '15%',
            width: '300px',
            height: '300px',
            opacity: 0.2,
            animation: 'knightFloat 3s ease-in-out infinite'
          }} aria-hidden="true">
            <KnightSvg />
          </div>
        </div>
      </section>

      <section id="tournaments" className="tournament-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title font-display">
              Tournament <span className="highlight">Explorer</span>
            </h2>
            <p className="section-description">
              Browse upcoming chess tournaments, filter by location and category, and register for events that
              match your skill level.
            </p>
          </div>

          <div className="card">
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Live Tournament Map
              </h3>
              <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                View tournaments on an interactive map. Click markers for details and PDF downloads.
              </p>
            </div>

            <div className="view-toggle" style={{ marginBottom: "1.25rem" }}>
              <button
                type="button"
                className={mapView === "mumbai" ? "active" : ""}
                onClick={() => setMapView("mumbai")}
              >
                Mumbai
              </button>
              <button
                type="button"
                className={mapView === "india" ? "active" : ""}
                onClick={() => setMapView("india")}
              >
                All India
              </button>
            </div>

            <div id="map" style={{ height: "550px", borderRadius: "16px", overflow: "hidden" }}>
              <MapContainer key={mapView} center={mapConfig.center} zoom={mapConfig.zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MarkerClusterGroup chunkedLoading>
                  {filtered
                    .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng))
                    .map((t) => (
                      <Marker key={t.id} position={[t.lat, t.lng]} icon={markerIcon ?? undefined}>
                        <Popup>
                          <div style={{ minWidth: 240 }}>
                            <div style={{ fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
                              {t.name}
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                              {t.location}, {t.state}
                            </div>
                            <div style={{ marginTop: 10, fontSize: 14, color: "var(--text-muted)" }}>
                             <span style={{ fontWeight: 700, color: "var(--text-primary)" }}> Date: {formatDate(t.date)}</span>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 14, color: "var(--text-muted)" }}>
                             <span style={{ fontWeight: 700, color: "var(--text-primary)" }}> Prize: {t.prize_pool}</span>
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                              <a
                                href={`/tournaments/${t.id}`}
                                className="btn btn-primary"
                                style={{ padding: "0.5rem 0.9rem", borderRadius: 10, fontSize: 14, color: "#e3e5e9ff"}}
                              >
                                View Details
                              </a>
                              <a
                                href={t.pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn"
                                style={{
                                  padding: "0.5rem 0.9rem",
                                  borderRadius: 10,
                                  fontSize: 14,
                                  background: "transparent",
                                  border: "2px solid var(--border)",
                                  color: "var(--text-primary)",
                                }}
                              >
                                Download PDF
                              </a>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                </MarkerClusterGroup>
              </MapContainer>
            </div>
          </div>

          <div className="card">
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Filters
              </h3>
              <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Search and refine tournaments. Updates apply instantly to both the map and table.
              </p>
            </div>

            <div className="filters-grid">
              <div className="filter-group">
                <label>Search</label>
                <input
                  className="form-input"
                  placeholder="Tournament name..."
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                />
              </div>

              <div className="filter-group">
                <label>Category</label>
                <select
                  className="form-select"
                  value={filters.category}
                  onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
                >
                  <option>All</option>
                  <option>Classical</option>
                  <option>Blitz</option>
                  <option>Rapid</option>
                  <option>Under 1800</option>
                  <option>Age Group</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Max Entry Fee</label>
                <input
                  type="number"
                  className="form-input"
                  value={filters.maxEntryFee}
                  onChange={(e) => setFilters((p) => ({ ...p, maxEntryFee: e.target.value }))}
                />
              </div>

              <div className="filter-group">
                <label>State</label>
                <select
                  className="form-select"
                  value={filters.state}
                  onChange={(e) => setFilters((p) => ({ ...p, state: e.target.value }))}
                >
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>FIDE Rated</label>
                <select
                  className="form-select"
                  value={filters.fideRated}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, fideRated: e.target.value as FilterState["fideRated"] }))
                  }
                >
                  <option value="all">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filters.startDate}
                  onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>

              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filters.endDate}
                  onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>

              <div className="filter-group">
                <label>&nbsp;</label>
                <button
                  type="button"
                  className="btn"
                  style={{
                    width: "100%",
                    background: "var(--surface-elevated)",
                    border: "2px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  onClick={() =>
                    setFilters({
                      search: "",
                      category: "All",
                      maxEntryFee: "",
                      state: "All",
                      fideRated: "all",
                      startDate: "",
                      endDate: "",
                    })
                  }
                >
                  Clear Filters
                </button>
              </div>
            </div>

            <div className="table-container">
              <div className="table-wrapper">
                {loading ? (
                  <div className="loading-message">Loading tournaments...</div>
                ) : error ? (
                  <div className="loading-message" style={{ color: "var(--error)" }}>
                    {error}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="loading-message">No tournaments match your filters.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Tournament</th>
                        <th>Location</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Entry Fee</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => (
                        <tr key={t.id} className="table-row">
                          <td>
                            <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                              {t.name} {t.fide_rated ? <span className="badge badge-fide">FIDE</span> : null}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                              ID: {t.id}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{t.location}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t.state}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatDate(t.date)}</td>
                          <td>
                            <span className="badge">{t.category}</span>
                          </td>
                          <td style={{ fontWeight: 800, color: "var(--primary)" }}>{t.entry_fee}</td>
                          <td>
                            <Link
                              href={`/tournaments/${t.id}`}
                              className="btn btn-primary"
                              style={{ padding: "0.5rem 0.9rem", borderRadius: 10, fontSize: 14 }}
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}