"use client";

import { useEffect, useRef, useState } from "react";

import {
  TRAFFIC_METRICS,
  formatCount,
  formatMonth,
  joinMetricLabels,
  type TrafficMetric,
  type TrafficMonth,
} from "@/lib/traffic";

export type ChartKind = "bars" | "line" | "area";

/** Series colors live in traffic.css (--viz-1 / --viz-2), light and dark. */
export const SERIES_COLOR: Record<TrafficMetric, string> = {
  visitors: "var(--viz-1)",
  pageViews: "var(--viz-2)",
};

const HEIGHT = 300; // plot + x-axis band, so the card never needs its own scroll
const MARGIN = { top: 28, right: 16, bottom: 32, left: 48 };
const BAR_MAX = 24;
const BAR_GAP = 2; // surface-colored gap between touching bars
const BAR_RADIUS = 4;
const TOOLTIP_WIDTH = 188;
const FALLBACK_WIDTH = 640;
const LABEL_CHAR_WIDTH = 7.5; // approx px per digit at 12px semibold, for collision checks

/** Measures an element's content width. Falls back to a fixed width until the first measurement. */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(Math.round(next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** Round axis ceiling and ticks (1/2/2.5/5 x 10^k steps, about four intervals). */
function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  // 2.5 steps only where they stay whole numbers (250, 2,500, ...).
  const factors = magnitude >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
  const factor = factors.find((f) => normalized <= f) ?? 10;
  const step = Math.max(1, factor * magnitude);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { top, ticks };
}

/** Full numbers under 10,000, compact (10K) once the axis reaches it. One style per axis. */
function formatTick(value: number, compact: boolean): string {
  if (!compact) return formatCount(value);
  return value >= 1000 ? `${value / 1000}K` : String(value);
}

/** Column with a rounded data-end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(BAR_RADIUS, w / 2, h);
  return [
    `M${x},${y + h}`,
    `V${y + r}`,
    `A${r},${r} 0 0 1 ${x + r},${y}`,
    `H${x + w - r}`,
    `A${r},${r} 0 0 1 ${x + w},${y + r}`,
    `V${y + h}`,
    "Z",
  ].join(" ");
}

interface Point {
  x: number;
  y: number;
}

function linePath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

interface TrafficChartProps {
  rows: readonly TrafficMonth[];
  /** Visible series, in fixed order. Color follows the metric, never its position. */
  metrics: readonly TrafficMetric[];
  kind: ChartKind;
  /** Shown beside the month in the tooltip, e.g. "Running total". */
  valueLabel?: string;
}

export default function TrafficChart({ rows, metrics, kind, valueLabel }: TrafficChartProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const series = TRAFFIC_METRICS.filter((m) => metrics.includes(m.key));
  const n = rows.length;
  const plotW = Math.max(1, width - MARGIN.left - MARGIN.right);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const band = plotW / Math.max(1, n);

  const max = Math.max(0, ...rows.flatMap((row) => series.map((s) => row[s.key])));
  const { top: axisTop, ticks } = niceScale(max);
  const compactTicks = axisTop >= 10_000;

  const cx = (i: number) => MARGIN.left + band * (i + 0.5);
  const y = (value: number) => MARGIN.top + plotH * (1 - value / axisTop);
  const baseline = MARGIN.top + plotH;

  // Bars: capped thickness, grouped per month, centered in the band.
  const barW = Math.max(
    2,
    Math.min(BAR_MAX, (band * 0.7 - (series.length - 1) * BAR_GAP) / series.length),
  );
  const groupW = series.length * barW + (series.length - 1) * BAR_GAP;
  const barX = (i: number, s: number) => cx(i) - groupW / 2 + s * (barW + BAR_GAP);

  // X labels: thin out when the band is narrow, always keep the newest month.
  const labelStyle = band >= 64 ? "medium" : "short";
  const labelStep = Math.max(1, Math.ceil((labelStyle === "medium" ? 64 : 44) / band));

  // Endpoint labels (newest month). In grouped bars the outer labels hang
  // away from the group (first ends at its bar's right edge, last starts at
  // its bar's left edge) so a short bar's label never sits under a taller
  // neighbor. Dropped when they would still collide; the tooltip and the
  // table carry every value.
  const last = n - 1;
  const grouped = kind === "bars" && series.length > 1;
  const endLabels = series.map((s, si) => {
    const value = rows[last]?.[s.key] ?? 0;
    const text = formatCount(value);
    const w = text.length * LABEL_CHAR_WIDTH;
    const anchor: "start" | "middle" | "end" = !grouped
      ? "middle"
      : si === 0
        ? "end"
        : si === series.length - 1
          ? "start"
          : "middle";
    const rawX =
      kind !== "bars"
        ? cx(last)
        : anchor === "end"
          ? barX(last, si) + barW
          : anchor === "start"
            ? barX(last, si)
            : barX(last, si) + barW / 2;
    const left = anchor === "end" ? w : anchor === "middle" ? w / 2 : 0;
    const right = anchor === "start" ? w : anchor === "middle" ? w / 2 : 0;
    const x = Math.min(width - MARGIN.right - right, Math.max(MARGIN.left + left, rawX));
    return {
      key: s.key,
      text,
      anchor,
      x,
      x0: x - left,
      x1: x + right,
      y: y(value) - (kind === "bars" ? 6 : 12),
    };
  });
  const labelsCollide = endLabels.some((a, i) =>
    endLabels
      .slice(i + 1)
      .some((b) => a.x0 < b.x1 && b.x0 < a.x1 && Math.abs(a.y - b.y) < 14),
  );
  // A grouped label hangs past its bar into the gap before the next month's
  // bars; when the gap is too small it would sit on top of them, so skip it.
  const labelsFit =
    !grouped ||
    endLabels.every((l) => l.x1 - l.x0 - barW <= band - groupW - 2);
  const showLabels = labelsFit && !labelsCollide;

  const activeRow = active === null ? null : rows[active];
  const tooltipLeft =
    active === null
      ? 0
      : cx(active) + 14 + TOOLTIP_WIDTH > width
        ? Math.max(0, cx(active) - 14 - TOOLTIP_WIDTH)
        : cx(active) + 14;

  const isLine = kind !== "bars";

  return (
    <div ref={containerRef} className="traffic-chart">
      {series.length > 1 && (
        <ul className="traffic-legend">
          {series.map((s) => (
            <li key={s.key}>
              <span
                aria-hidden="true"
                className={isLine ? "traffic-swatch-line" : "traffic-swatch"}
                style={{ background: SERIES_COLOR[s.key] }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div
        role="group"
        aria-label={`${joinMetricLabels(series.map((s) => s.key))} per month`}
        className="traffic-plot"
        style={{ height: HEIGHT }}
      >
        <svg width={width} height={HEIGHT}>
          {/* Grid + y ticks */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                dy={4}
                textAnchor="end"
                fontSize={12}
                fill="var(--text-muted)"
                className="traffic-num"
              >
                {formatTick(tick, compactTicks)}
              </text>
            </g>
          ))}
          <line
            x1={MARGIN.left}
            x2={width - MARGIN.right}
            y1={baseline}
            y2={baseline}
            stroke="var(--text-muted)"
            strokeOpacity={0.45}
            strokeWidth={1}
          />

          {/* X labels */}
          {rows.map((row, i) =>
            (last - i) % labelStep === 0 ? (
              <text
                key={row.month}
                x={cx(i)}
                y={baseline + 20}
                textAnchor="middle"
                fontSize={12}
                fill="var(--text-muted)"
              >
                {formatMonth(row.month, labelStyle)}
              </text>
            ) : null,
          )}

          {/* Crosshair on line and area */}
          {isLine && active !== null && (
            <line
              x1={cx(active)}
              x2={cx(active)}
              y1={MARGIN.top}
              y2={baseline}
              stroke="var(--text-muted)"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          )}

          {/* Bars */}
          {kind === "bars" &&
            series.map((s, si) =>
              rows.map((row, i) => {
                const value = row[s.key];
                const h = baseline - y(value);
                if (h <= 0) return null;
                return (
                  <path
                    key={`${s.key}-${row.month}`}
                    d={columnPath(barX(i, si), y(value), barW, h)}
                    fill={SERIES_COLOR[s.key]}
                    opacity={active === null || active === i ? 1 : 0.55}
                  />
                );
              }),
            )}

          {/* Area wash + lines */}
          {isLine &&
            series.map((s) => {
              if (n < 2) return null;
              const points = rows.map((row, i) => ({ x: cx(i), y: y(row[s.key]) }));
              return (
                <g key={s.key}>
                  {kind === "area" && (
                    <path
                      d={`${linePath(points)} L${points[n - 1].x},${baseline} L${points[0].x},${baseline} Z`}
                      fill={SERIES_COLOR[s.key]}
                      fillOpacity={0.1}
                    />
                  )}
                  <path
                    d={linePath(points)}
                    fill="none"
                    stroke={SERIES_COLOR[s.key]}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

          {/* Markers: every point while the series is short, else newest + hovered */}
          {isLine &&
            series.map((s) =>
              rows.map((row, i) =>
                n <= 12 || i === last || i === active ? (
                  <circle
                    key={`${s.key}-${row.month}`}
                    cx={cx(i)}
                    cy={y(row[s.key])}
                    r={i === active ? 5 : 4}
                    fill={SERIES_COLOR[s.key]}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                ) : null,
              ),
            )}

          {/* Newest-month value labels */}
          {showLabels &&
            endLabels.map((label) => (
              <text
                key={label.key}
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                fontSize={12}
                fontWeight={600}
                fill="var(--text-primary)"
                stroke="var(--surface)"
                strokeWidth={3}
                paintOrder="stroke"
                className="traffic-num"
              >
                {label.text}
              </text>
            ))}

          {/* Hit layer: one full-height band per month, hover and keyboard focus */}
          {rows.map((row, i) => (
            <rect
              key={row.month}
              x={MARGIN.left + band * i}
              y={MARGIN.top}
              width={band}
              height={plotH + MARGIN.bottom}
              role="img"
              tabIndex={0}
              aria-label={`${formatMonth(row.month, "long")}${valueLabel ? `, ${valueLabel.toLowerCase()}` : ""}: ${series
                .map((s) => `${formatCount(row[s.key])} ${s.label.toLowerCase()}`)
                .join(", ")}`}
              className="traffic-hit"
              onPointerEnter={() => setActive(i)}
              onPointerMove={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}
        </svg>

        {activeRow && (
          <div
            aria-hidden="true"
            className="traffic-tooltip"
            style={{ left: tooltipLeft, top: MARGIN.top, width: TOOLTIP_WIDTH }}
          >
            <div className="traffic-tooltip-month">
              {formatMonth(activeRow.month, "long")}
              {valueLabel ? `, ${valueLabel.toLowerCase()}` : ""}
            </div>
            <div className="traffic-tooltip-rows">
              {/* Highest value first, so the rows sit in the same order as the lines on the chart. */}
              {[...series].sort((a, b) => activeRow[b.key] - activeRow[a.key]).map((s) => (
                <div key={s.key} className="traffic-tooltip-row">
                  <span
                    className="traffic-swatch-line"
                    style={{ background: SERIES_COLOR[s.key], width: 12 }}
                  />
                  <strong className="traffic-num">{formatCount(activeRow[s.key])}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {n === 1 && isLine && (
        <p className="traffic-note">
          A line needs two months to connect. Showing the first month as a single point.
        </p>
      )}
    </div>
  );
}
