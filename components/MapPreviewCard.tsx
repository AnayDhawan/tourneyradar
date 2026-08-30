"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import dynamic from "next/dynamic";
import Link from "next/link";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const MarkerClusterGroup = dynamic(
  () => import("react-leaflet-cluster").then((m) => m.default as unknown as React.ComponentType<any>),
  { ssr: false },
);

interface PreviewTournament {
  id: string;
  lat?: number;
  lng?: number;
}

interface MapPreviewCardProps {
  tournaments: PreviewTournament[];
}

const MAX_PREVIEW_MARKERS = 150;

/**
 * Non-interactive snapshot of the live tournament map for the hero. The
 * whole card is a link that scrolls down to the real, interactive
 * Tournament Explorer (#tournaments) on the same page.
 */
export default function MapPreviewCard({ tournaments }: MapPreviewCardProps) {
  const points = tournaments
    .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng))
    .slice(0, MAX_PREVIEW_MARKERS);

  return (
    <div className="map-preview-card">
      <MapContainer
        center={[30, 0]}
        zoom={2}
        dragging={false}
        scrollWheelZoom={false}
        zoomControl={false}
        touchZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MarkerClusterGroup chunkedLoading>
          {points.map((t) => (
            <Marker key={t.id} position={[t.lat!, t.lng!]} />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <div className="map-preview-badge">Live data, OpenStreetMap</div>

      <Link href="#tournaments" aria-label="View the live tournament map" className="map-preview-overlay">
        <span className="map-preview-pill">
          View live map
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </Link>
    </div>
  );
}
