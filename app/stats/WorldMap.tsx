"use client";

import { VectorMap } from "@react-jvectormap/core";
import { worldMill } from "@react-jvectormap/world";

interface Props {
  visitorsByCountry: Record<string, number>;
  tournamentsByCountry: Record<string, number>;
}

export default function WorldMap({ visitorsByCountry, tournamentsByCountry }: Props) {
  const allCountryCodes = new Set([
    ...Object.keys(visitorsByCountry),
    ...Object.keys(tournamentsByCountry),
  ]);

  const visitorSeries: Record<string, number> = {};
  allCountryCodes.forEach(code => {
    visitorSeries[code] = visitorsByCountry[code] ?? 0;
  });

  return (
    <div style={{ height: "450px", background: "var(--surface-elevated)", borderRadius: "8px", overflow: "hidden" }}>
      <VectorMap
        map={worldMill}
        backgroundColor="transparent"
        style={{ width: "100%", height: "100%" }}
        series={{
          regions: [{
            attribute: "fill",
            values: visitorSeries,
            scale: ["#1e3a5f", "#3b82f6"],
            normalizeFunction: "polynomial",
          }]
        }}
        regionStyle={{
          initial: {
            fill: "#1e293b",
            stroke: "#334155",
            strokeWidth: 0.5,
          },
          hover: {
            fill: "#2563eb",
            cursor: "pointer",
          },
          selected: {
            fill: "#1d4ed8",
          },
        }}
        onRegionTipShow={(e: any, el: any, code: string) => {
          const visitors = visitorsByCountry[code] ?? 0;
          const tournaments = tournamentsByCountry[code] ?? 0;
          const countryName = el.html();
          if (visitors === 0 && tournaments === 0) {
            e.preventDefault();
            return;
          }
          el.html(`
            <div style="
              background: #1e293b;
              border: 1px solid #334155;
              border-radius: 8px;
              padding: 10px 14px;
              font-family: Inter, sans-serif;
              min-width: 140px;
            ">
              <div style="font-weight: 700; color: #f8fafc; margin-bottom: 6px; font-size: 13px;">
                ${countryName}
              </div>
              ${visitors > 0 ? `<div style="color: #93c5fd; font-size: 12px;">👤 ${visitors.toLocaleString()} visitor${visitors !== 1 ? 's' : ''}</div>` : ''}
              ${tournaments > 0 ? `<div style="color: #6ee7b7; font-size: 12px; margin-top: 2px;">♟ ${tournaments.toLocaleString()} tournament${tournaments !== 1 ? 's' : ''}</div>` : ''}
            </div>
          `);
        }}
      />
    </div>
  );
}
