"use client";

import { useState, type ReactNode } from "react";

import {
  TRAFFIC_METRICS,
  formatCount,
  formatMonth,
  joinMetricLabels,
  pagesPerVisitor,
  toRunningTotal,
  type TrafficMetric,
  type TrafficMonth,
} from "@/lib/traffic";
import TrafficChart, { SERIES_COLOR, type ChartKind } from "./TrafficChart";

type ViewKind = ChartKind | "table";
type MetricChoice = "both" | TrafficMetric;
type ValueMode = "monthly" | "running";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const VIEW_OPTIONS: Option<ViewKind>[] = [
  {
    value: "bars",
    label: "Bars",
    icon: (
      <Icon>
        <path d="M5 20V11M12 20V4M19 20V14" />
      </Icon>
    ),
  },
  {
    value: "line",
    label: "Line",
    icon: (
      <Icon>
        <path d="M3 17l6-6 4 4 8-9" />
      </Icon>
    ),
  },
  {
    value: "area",
    label: "Area",
    icon: (
      <Icon>
        <path d="M3 17l6-6 4 4 8-9v11H3z" />
      </Icon>
    ),
  },
  {
    value: "table",
    label: "Table",
    icon: (
      <Icon>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M9 4v16" />
      </Icon>
    ),
  },
];

const METRIC_OPTIONS: Option<MetricChoice>[] = [
  { value: "both", label: "Both" },
  { value: "visitors", label: "Visitors" },
  { value: "pageViews", label: "Page views" },
];

const VALUE_OPTIONS: Option<ValueMode>[] = [
  { value: "monthly", label: "Monthly" },
  { value: "running", label: "Running total" },
];

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

/** Labeled segmented control: each option is a real button, state in aria-pressed. */
function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="traffic-control">
      <span className="traffic-control-label">{label}</span>
      <div role="group" aria-label={label} className="traffic-segmented">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TrafficExplorerProps {
  months: readonly TrafficMonth[];
}

export default function TrafficExplorer({ months }: TrafficExplorerProps) {
  const [view, setView] = useState<ViewKind>("bars");
  const [metric, setMetric] = useState<MetricChoice>("both");
  const [valueMode, setValueMode] = useState<ValueMode>("monthly");

  const rows = valueMode === "running" ? toRunningTotal(months) : months;
  const metrics: TrafficMetric[] = metric === "both" ? ["visitors", "pageViews"] : [metric];
  const metricLabels = joinMetricLabels(metrics);
  const visibleMetrics = TRAFFIC_METRICS.filter((m) => metrics.includes(m.key));

  const first = months[0];
  const lastMonth = months[months.length - 1];
  const range =
    !first || !lastMonth
      ? ""
      : first.month === lastMonth.month
        ? formatMonth(first.month, "long")
        : `${formatMonth(first.month, "medium")} to ${formatMonth(lastMonth.month, "medium")}`;
  const running = valueMode === "running";

  const showTable = view === "table";
  const tableRows = [...rows].reverse(); // newest first

  return (
    <div aria-label="Traffic chart" role="region">
      <div className="traffic-controls">
        <Segmented label="Chart" value={view} options={VIEW_OPTIONS} onChange={setView} />
        <Segmented label="Show" value={metric} options={METRIC_OPTIONS} onChange={setMetric} />
        <Segmented
          label="Values"
          value={valueMode}
          options={VALUE_OPTIONS}
          onChange={setValueMode}
        />
      </div>

      <div className="card traffic-card">
        <h3 className="traffic-card-title font-display">{metricLabels} per month</h3>
        <p className="traffic-card-sub" data-testid="traffic-range">
          {range}
          {running ? ", running total" : ""}
        </p>

        {!showTable && (
          <TrafficChart
            rows={rows}
            metrics={metrics}
            kind={view as ChartKind}
            valueLabel={running ? "Running total" : undefined}
          />
        )}

        {running && metrics.includes("visitors") && (
          <p className="traffic-note">
            Visitors are unique within each month, so a returning visitor is counted once per
            month in the running total.
          </p>
        )}

        {/* Table view: the visible twin when chosen, screen-reader-only otherwise. */}
        <div className={showTable ? "traffic-table-wrap" : "traffic-sr-only"}>
          <table className="traffic-table">
            <caption className="traffic-sr-only">
              {metricLabels} per month{running ? ", running total" : ""}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="traffic-left">
                  Month
                </th>
                {visibleMetrics.map((m) => (
                  <th key={m.key} scope="col">
                    <span className="traffic-table-head">
                      <span
                        aria-hidden="true"
                        className="traffic-swatch"
                        style={{ background: SERIES_COLOR[m.key] }}
                      />
                      {m.label}
                    </span>
                  </th>
                ))}
                {metric === "both" && <th scope="col">Pages per visitor</th>}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const ratio = pagesPerVisitor(row);
                return (
                  <tr key={row.month}>
                    <th scope="row" className="traffic-left">
                      {formatMonth(row.month, "long")}
                    </th>
                    {metrics.map((key) => (
                      <td key={key}>{formatCount(row[key])}</td>
                    ))}
                    {metric === "both" && <td>{ratio === null ? "n/a" : ratio.toFixed(2)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
