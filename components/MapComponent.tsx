"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";

interface Tournament {
  id: string;
  name: string;
  date: string;
  city?: string;
  country_code?: string;
  category?: string;
  lat?: number;
  lng?: number;
}

interface Props {
  tournaments: Tournament[];
}

export default function MapComponent({ tournaments }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [30, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    // @ts-expect-error - markerClusterGroup is added by leaflet.markercluster
    markersRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    });

    mapRef.current.addLayer(markersRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!markersRef.current) return;

    markersRef.current.clearLayers();

    const validTournaments = tournaments.filter(
      (t) => t.lat && t.lng && !isNaN(t.lat) && !isNaN(t.lng)
    );

    validTournaments.forEach((tournament) => {
      const marker = L.marker([tournament.lat!, tournament.lng!]);
      
      const popupContent = `
        <div style="min-width: 200px;">
          <strong style="font-size: 14px;">${tournament.name}</strong>
          <br/>
          <span style="color: #666; font-size: 12px;">
            ${tournament.city || ""}${tournament.country_code ? `, ${tournament.country_code}` : ""}
          </span>
          <br/>
          <span style="color: #666; font-size: 12px;">
            ${new Date(tournament.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <br/>
          <a href="/tournaments/${tournament.id}" style="color: #3b82f6; font-size: 12px; text-decoration: none;">
            View Details →
          </a>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      markersRef.current!.addLayer(marker);
    });

    if (validTournaments.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(
        validTournaments.map((t) => [t.lat!, t.lng!] as [number, number])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
    }
  }, [tournaments]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "500px",
        width: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        background: "var(--surface)",
      }}
    />
  );
}
