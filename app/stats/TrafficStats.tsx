import type { ReactNode } from "react";

import {
  formatCount,
  formatMonth,
  pagesPerVisitor,
  percentChange,
  type TrafficMonth,
} from "@/lib/traffic";

type Direction = "up" | "down" | "flat";

const ARROWS: Record<Direction, ReactNode> = {
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  down: <path d="M12 5v14M19 12l-7 7-7-7" />,
  flat: <path d="M5 12h14" />,
};

interface StatProps {
  label: string;
  value: string;
  /** Percent change against the previous month, or null when there is none. */
  change: number | null;
  /** Month the change is measured against, for the caption. */
  comparedTo: string | null;
}

function Stat({ label, value, change, comparedTo }: StatProps) {
  const rounded = change === null ? null : Math.round(change * 10) / 10;
  const direction: Direction =
    rounded === null || rounded === 0 ? "flat" : rounded > 0 ? "up" : "down";

  return (
    <div className="card traffic-stat">
      <div className="traffic-stat-label">{label}</div>
      <div className="traffic-stat-value font-display">{value}</div>
      <div className="traffic-stat-delta">
        {rounded === null || comparedTo === null ? (
          "First month tracked"
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={direction === "flat" ? undefined : `traffic-${direction}`}
            >
              {ARROWS[direction]}
            </svg>
            <span>
              {rounded > 0 ? "+" : ""}
              {rounded}% vs {comparedTo}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

interface TrafficStatsProps {
  months: readonly TrafficMonth[];
}

/** Headline numbers for the newest month, with change against the month before it. */
export default function TrafficStats({ months }: TrafficStatsProps) {
  const latest = months[months.length - 1];
  if (!latest) return null;
  const previous = months.length > 1 ? months[months.length - 2] : undefined;

  const ratio = pagesPerVisitor(latest);
  const previousRatio = previous ? pagesPerVisitor(previous) : null;
  const comparedTo = previous ? formatMonth(previous.month, "medium") : null;

  return (
    <div>
      <h3 className="traffic-month">{formatMonth(latest.month, "long")}</h3>
      <div className="traffic-stats">
        <Stat
          label="Visitors"
          value={formatCount(latest.visitors)}
          change={percentChange(latest.visitors, previous?.visitors)}
          comparedTo={comparedTo}
        />
        <Stat
          label="Page views"
          value={formatCount(latest.pageViews)}
          change={percentChange(latest.pageViews, previous?.pageViews)}
          comparedTo={comparedTo}
        />
        <Stat
          label="Pages per visitor"
          value={ratio === null ? "n/a" : ratio.toFixed(2)}
          change={
            ratio === null || previousRatio === null ? null : percentChange(ratio, previousRatio)
          }
          comparedTo={comparedTo}
        />
      </div>
    </div>
  );
}
