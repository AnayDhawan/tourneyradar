"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import Footer from "@/components/Footer";

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

type MapView = "europe" | "world";

interface Tournament {
  id: string;
  name: string;
  date: string;
  end_date?: string;
  city?: string;
  state?: string;
  location?: string;
  country?: string;
  country_code?: string;
  category?: string;
  fide_rated?: boolean;
  lat?: number;
  lng?: number;
  source_url?: string;
  external_link?: string;
  created_at?: string;
}

type FilterState = {
  search: string;
  category: string;
  state: string;
  fideRated: "all" | "yes" | "no";
  startDate: string;
  endDate: string;
};

interface Props {
  initialTournaments: Tournament[];
  stats: {
    total: number;
    countries: number;
    mapped: number;
  };
}

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

export default function HomePageClient({ initialTournaments, stats }: Props) {
  const { user, userType, loading: authLoading } = useAuth();
  const [mapView, setMapView] = useState<MapView>("europe");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "All",
    state: "All",
    fideRated: "all",
    startDate: "",
    endDate: "",
  });

  const [markerIcon, setMarkerIcon] = useState<import("leaflet").DivIcon | null>(null);

  // Animated stats
  const [animatedStats, setAnimatedStats] = useState({ total: 0, countries: 0, mapped: 0 });

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const timer = setInterval(() => {
      step++;
      const progress = easeOutQuart(step / steps);
      setAnimatedStats({
        total: Math.round(stats.total * progress),
        countries: Math.round(stats.countries * progress),
        mapped: Math.round(stats.mapped * progress),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [stats]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const currentTheme = localStorage.getItem('theme');
      if (!currentTheme || currentTheme === 'system') {
        document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function setupMarkerIcon() {
      const L = await import("leaflet");
      const icon = L.divIcon({
        className: "tournament-marker",
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M19 22H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3l2-3h4l2 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/>
              <circle cx="12" cy="13" r="4" fill="white" stroke="white"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });
      if (!cancelled) setMarkerIcon(icon);
    }

    setupMarkerIcon();
    return () => {
      cancelled = true;
    };
  }, []);

  const states = useMemo(() => {
    const unique = new Set(
      initialTournaments
        .map((t) => normalizeString(t.state))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    );
    return ["All", ...Array.from(unique)];
  }, [initialTournaments]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return initialTournaments.filter((t) => {
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

      return true;
    });
  }, [filters, initialTournaments]);

  const mapConfig = useMemo(() => {
    if (mapView === "europe") {
      return { center: [48.8566, 2.3522] as [number, number], zoom: 4 };
    }
    return { center: [30, 0] as [number, number], zoom: 2 };
  }, [mapView]);

  const getDashboardLink = () => {
    if (userType === "player") return { href: "/player/wishlist", label: "My Wishlist" };
    if (userType === "admin") return { href: "/admin/dashboard", label: "Admin Panel" };
    return { href: "/player/login", label: "Login" };
  };

  const dashboard = getDashboardLink();

  return (
    <>
      {/* Mobile Menu Overlay */}
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
                <a href={dashboard.href} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>{dashboard.label}</a>
              )}
            </div>

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
                Discover Chess <span className="highlight">Tournaments<br />Worldwide</span>
              </h1>

              <p className="hero-description">
                A free, open-source platform aggregating over-the-board chess tournaments 
                from around the world. Find your next event.
              </p>

              <div className="btn-group">
                <a href="/tournaments" className="btn btn-primary">
                  Explore Tournaments
                </a>
                <a 
                  href="https://github.com/AnayDhawan/tourneyradar" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  View on GitHub
                </a>
              </div>

              <div className="stats-container" aria-label="Site statistics">
                <div className="stat-item">
                  <div className="stat-number">{animatedStats.total}</div>
                  <div className="stat-label">Upcoming Events</div> 
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <div className="stat-number">{animatedStats.countries}</div>
                  <div className="stat-label">Countries</div>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                  <div className="stat-number">{animatedStats.mapped}</div>
                  <div className="stat-label">On Map</div>
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
                Click any marker for details.
              </p>
            </div>

            <div className="view-toggle" style={{ marginBottom: "1.25rem" }}>
              <button
                type="button"
                className={mapView === "europe" ? "active" : ""}
                onClick={() => setMapView("europe")}
              >
                Europe
              </button>
              <button
                type="button"
                className={mapView === "world" ? "active" : ""}
                onClick={() => setMapView("world")}
              >
                World
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
                      <Marker key={t.id} position={[t.lat!, t.lng!]} icon={markerIcon ?? undefined}>
                        <Popup>
                          <div style={{ minWidth: 220, padding: "4px" }}>
                            <div style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 8, fontSize: 14, lineHeight: 1.3 }}>
                              {t.name}
                            </div>
                            <div style={{ color: "#666", fontSize: 13, marginBottom: 4 }}>
                              📍 {t.city || t.location}{t.country_code ? `, ${t.country_code}` : ''}
                            </div>
                            <div style={{ color: "#666", fontSize: 13, marginBottom: 12 }}>
                              📅 {formatDate(t.date)}
                            </div>
                            <a
                              href={`/tournaments/${t.id}`}
                              style={{
                                display: "inline-block",
                                background: "#3b82f6",
                                color: "white",
                                padding: "6px 14px",
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: 600,
                                textDecoration: "none"
                              }}
                            >
                              View Details →
                            </a>
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
                {filtered.length === 0 ? (
                  <div className="loading-message">No tournaments match your filters.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Tournament</th>
                        <th>Location</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => (
                        <tr key={t.id} className="table-row">
                          <td>
                            <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                              {(t.fide_rated || t.name.toLowerCase().includes('fide')) && (
                                <span className="badge badge-fide">FIDE</span>
                              )}
                              {t.name}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                              ID: {t.id}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{t.location || t.city || 'TBA'}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t.state}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatDate(t.date)}</td>
                          <td>
                            <span className="badge">{t.category}</span>
                          </td>
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
