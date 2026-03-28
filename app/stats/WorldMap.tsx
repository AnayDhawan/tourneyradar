"use client";

import { useState, useMemo, useEffect } from "react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const WIDTH = 960;
const HEIGHT = 500;

// ISO 3166-1 numeric → alpha-2
const NUM_TO_A2: Record<number, string> = {
  4: "AF", 8: "AL", 12: "DZ", 20: "AD", 24: "AO", 31: "AZ", 32: "AR",
  36: "AU", 40: "AT", 50: "BD", 51: "AM", 56: "BE", 64: "BT", 68: "BO",
  70: "BA", 72: "BW", 76: "BR", 84: "BZ", 90: "SB", 96: "BN", 100: "BG",
  104: "MM", 108: "BI", 112: "BY", 116: "KH", 120: "CM", 124: "CA",
  132: "CV", 140: "CF", 144: "LK", 152: "CL", 156: "CN", 170: "CO",
  178: "CG", 180: "CD", 188: "CR", 191: "HR", 192: "CU", 196: "CY",
  203: "CZ", 204: "BJ", 208: "DK", 214: "DO", 218: "EC", 222: "SV",
  226: "GQ", 231: "ET", 232: "ER", 233: "EE", 242: "FJ", 246: "FI",
  250: "FR", 266: "GA", 268: "GE", 270: "GM", 276: "DE", 288: "GH",
  300: "GR", 320: "GT", 324: "GN", 328: "GY", 332: "HT", 340: "HN",
  348: "HU", 352: "IS", 356: "IN", 360: "ID", 364: "IR", 368: "IQ",
  372: "IE", 376: "IL", 380: "IT", 388: "JM", 392: "JP", 398: "KZ",
  400: "JO", 404: "KE", 408: "KP", 410: "KR", 414: "KW", 417: "KG",
  418: "LA", 422: "LB", 426: "LS", 428: "LV", 430: "LR", 434: "LY",
  438: "LI", 440: "LT", 442: "LU", 450: "MG", 454: "MW", 458: "MY",
  462: "MV", 466: "ML", 470: "MT", 478: "MR", 484: "MX", 492: "MC",
  496: "MN", 498: "MD", 499: "ME", 504: "MA", 508: "MZ", 516: "NA",
  524: "NP", 528: "NL", 548: "VU", 554: "NZ", 558: "NI", 562: "NE",
  566: "NG", 578: "NO", 586: "PK", 591: "PA", 598: "PG", 600: "PY",
  604: "PE", 608: "PH", 616: "PL", 620: "PT", 626: "TL", 634: "QA",
  642: "RO", 643: "RU", 646: "RW", 674: "SM", 682: "SA", 686: "SN",
  688: "RS", 694: "SL", 703: "SK", 704: "VN", 705: "SI", 706: "SO",
  710: "ZA", 716: "ZW", 724: "ES", 728: "SS", 729: "SD", 740: "SR",
  748: "SZ", 752: "SE", 756: "CH", 760: "SY", 762: "TJ", 764: "TH",
  768: "TG", 784: "AE", 788: "TN", 792: "TR", 795: "TM", 800: "UG",
  804: "UA", 807: "MK", 818: "EG", 826: "GB", 834: "TZ", 840: "US",
  858: "UY", 860: "UZ", 862: "VE", 887: "YE", 894: "ZM",
};

function flagEmoji(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return "🌐";
  return [...alpha2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

interface CountryInfo {
  alpha2: string;
  name: string;
  visitors: number;
  tournaments: number;
}

interface Props {
  visitorsByCountry: Record<string, number>;
  tournamentsByCountry: Record<string, number>;
}

export default function WorldMap({ visitorsByCountry, tournamentsByCountry }: Props) {
  const [selected, setSelected] = useState<CountryInfo | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [features, setFeatures] = useState<GeoJSON.Feature[]>([]);
  const [pathGenerator, setPathGenerator] = useState<((f: GeoJSON.Feature) => string | null) | null>(null);

  const maxVisitors = useMemo(
    () => Math.max(...Object.values(visitorsByCountry), 1),
    [visitorsByCountry],
  );

  useEffect(() => {
    async function load() {
      const [{ geoNaturalEarth1, geoPath }, topojson, topo] = await Promise.all([
        import("d3-geo"),
        import("topojson-client"),
        fetch(GEO_URL).then((r) => r.json())
      ]);

      const projection = geoNaturalEarth1()
        .scale(153)
        .translate([WIDTH / 2, HEIGHT / 2 + 20]);
      setPathGenerator(() => geoPath(projection));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const collection = topojson.feature(topo, (topo as any).objects.countries) as unknown as GeoJSON.FeatureCollection;
      setFeatures(collection.features);
    }
    load().catch(() => {});
  }, []);

  return (
    <div>
      {/* Map */}
      <div style={{ background: "var(--surface-elevated)", borderRadius: "8px", overflow: "hidden", lineHeight: 0 }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block" }}
        >
          {features.map((feature) => {
            const numId = parseInt(String(feature.id), 10);
            const alpha2 = NUM_TO_A2[numId] ?? "";
            const visitors = alpha2 ? (visitorsByCountry[alpha2] ?? 0) : 0;
            const tournaments = alpha2 ? (tournamentsByCountry[alpha2] ?? 0) : 0;
            const hasTournaments = tournaments > 0;
            const isActive = hoveredId === numId || (!!alpha2 && selected?.alpha2 === alpha2);

            let fill: string;
            let fillOpacity: number;
            let stroke: string;
            if (visitors > 0) {
              fill = "var(--primary)";
              fillOpacity = 0.2 + 0.8 * Math.pow(visitors / maxVisitors, 0.4);
              stroke = isActive ? "var(--primary)" : "var(--border)";
            } else if (hasTournaments) {
              fill = "#64748b";
              fillOpacity = 1;
              stroke = isActive ? "#94a3b8" : "var(--border)";
            } else {
              fill = "var(--surface-elevated)";
              fillOpacity = 1;
              stroke = "var(--border)";
            }

            const d = pathGenerator ? pathGenerator(feature) : null;
            if (!d) return null;

            return (
              <path
                key={numId || String(feature.id)}
                d={d}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={stroke}
                strokeWidth={isActive ? 1 : 0.5}
                style={{ cursor: alpha2 ? "pointer" : "default", outline: "none" }}
                onMouseEnter={() => setHoveredId(numId)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  if (!alpha2) return;
                  if (selected?.alpha2 === alpha2) { setSelected(null); return; }
                  setSelected({
                    alpha2,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name: (feature.properties as any)?.name ?? alpha2,
                    visitors,
                    tournaments,
                  });
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "2px", background: "var(--primary)", opacity: 0.3 }} /> Visitors (low)
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", marginLeft: "0.5rem" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "2px", background: "var(--primary)" }} /> Visitors (high)
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", marginLeft: "0.5rem" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "2px", background: "#64748b" }} /> Tournaments only
        </span>
      </div>

      {/* Info panel */}
      {selected ? (
        <div style={{
          marginTop: "1rem",
          padding: "1.25rem 1.5rem",
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <span style={{ fontSize: "2rem", lineHeight: 1 }}>{flagEmoji(selected.alpha2)}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{selected.name}</div>
              {selected.visitors === 0 && selected.tournaments === 0 ? (
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>No data available</div>
              ) : (
                <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>{selected.visitors.toLocaleString()}</strong> visitors
                  </span>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>{selected.tournaments.toLocaleString()}</strong> tournaments
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelected(null)}
            aria-label="Dismiss"
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.2rem 0.6rem",
              fontSize: "1.125rem",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >×</button>
        </div>
      ) : (
        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.75rem", textAlign: "center" }}>
          Click a country to see details
        </p>
      )}
    </div>
  );
}
