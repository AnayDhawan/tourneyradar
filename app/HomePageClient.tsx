"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import Footer from "@/components/Footer";
import { trackEvent } from "@/lib/track";
import { useThemePreference } from "@/lib/theme";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import SiteNav from "@/components/SiteNav";

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

// Isolated in its own component so the 60-tick count-up interval only
// re-renders this small subtree, not the whole page (map + tournament
// table included) on every tick.
function HeroStats({ stats }: { stats: Props["stats"] }) {
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

  return (
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
  );
}

export default function HomePageClient({ initialTournaments, stats }: Props) {
  const { user, userType, loading: authLoading } = useAuth();
  const [mapView, setMapView] = useState<MapView>("europe");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useThemePreference();

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "All",
    state: "All",
    fideRated: "all",
    startDate: "",
    endDate: "",
  });

  const [markerIcon, setMarkerIcon] = useState<import("leaflet").DivIcon | null>(null);

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

  const TABLE_PAGE_SIZE = 24;
  const [tablePage, setTablePage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE));

  useEffect(() => {
    setTablePage(1);
  }, [filters]);

  const paginated = useMemo(
    () => filtered.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE),
    [filtered, tablePage],
  );

  const mapConfig = useMemo(() => {
    if (mapView === "europe") {
      return { center: [48.8566, 2.3522] as [number, number], zoom: 4 };
    }
    return { center: [30, 0] as [number, number], zoom: 2 };
  }, [mapView]);

  const getDashboardLink = () => {
    if (userType === "player") return { href: "/player/wishlist", label: "My Wishlist" };
    return { href: "/player/register", label: "Sign Up" };
  };

  const dashboard = getDashboardLink();

  // Tell StarPrompt the user got value (used a filter / opened a tournament),
  // so it can fire the star nudge at a value moment instead of waiting on time.
  const markEngaged = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tr:engaged"));
    }
  };

  return (
    <>
      {/* Mobile Menu Overlay */}
      <MobileNavDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        dashboard={authLoading ? null : dashboard}
        showThemeToggle
      />

      <section className="hero-bg">
        <SiteNav onMenuClick={() => setMobileMenuOpen(true)} />

        <div className="hero-content-wrapper">
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title font-display">
                Discover Chess <span className="highlight">Tournaments<br />Worldwide</span>
              </h1>

              <p className="hero-description">
                A platform aggregating over-the-board chess tournaments
                from around the world. Find your next event.
              </p>

              <div className="hero-cta-block">
                <div className="btn-group">
                  <Link href="/tournaments" className="btn btn-primary">
                    Explore Tournaments
                  </Link>
                  <a
                    href="https://github.com/AnayDhawan/tourneyradar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    onClick={() => trackEvent("star_link", { src: "hero" })}
                  >
                    View on GitHub
                  </a>
                </div>

                <Link href="/player/register" className="btn btn-signup">
                  Sign up, it&apos;s Free!
                </Link>
              </div>

              <HeroStats stats={stats} />
            </div>
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
                <label htmlFor="tournament-search">Search</label>
                <input
                  id="tournament-search"
                  className="form-input"
                  placeholder="Tournament name..."
                  aria-label="Search tournaments by name"
                  value={filters.search}
                  onChange={(e) => { markEngaged(); setFilters((p) => ({ ...p, search: e.target.value })); }}
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

            <div style={{ textAlign: 'right', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Find this useful?{' '}
              <a
                href="https://github.com/AnayDhawan/tourneyradar"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', fontWeight: 700 }}
                onClick={() => trackEvent('star_link', { src: 'home_nudge' })}
              >
                ⭐ Star us on GitHub
              </a>
            </div>

            <div
              aria-live="polite"
              role="status"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              {filtered.length === 0
                ? filters.search
                  ? `No tournaments match "${filters.search}"`
                  : "No tournaments match your filters"
                : `${filtered.length} tournament${filtered.length === 1 ? "" : "s"} found${
                    filters.search ? ` for "${filters.search}"` : ""
                  }, showing ${paginated.length} on page ${tablePage} of ${totalPages}`}
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
                      {paginated.map((t) => (
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
                          <td data-label="Location">
                            <div style={{
                              fontWeight: 600,
                              maxWidth: 200,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              wordBreak: 'break-word',
                            }}>
                              {t.city || t.location || 'TBA'}
                              {t.country_code ? `, ${t.country_code}` : ''}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                              {t.state || t.country || ''}
                            </div>
                          </td>
                          <td data-label="Date" style={{ fontWeight: 600 }}>{formatDate(t.date)}</td>
                          <td data-label="Category">
                            <span className="badge">{t.category}</span>
                          </td>
                          <td>
                            <Link
                              href={`/tournaments/${t.id}`}
                              className="btn btn-primary"
                              style={{ padding: "0.5rem 0.9rem", borderRadius: 10, fontSize: 14 }}
                              onClick={markEngaged}
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

              {filtered.length > 0 && totalPages > 1 && (
                <div className="table-pagination" aria-label="Table pagination">
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: "0.5rem 1rem", fontSize: 14 }}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                    Page {tablePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: "0.5rem 1rem", fontSize: 14 }}
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                    disabled={tablePage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
