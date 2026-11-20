import { describe, expect, it } from "vitest";

import {
  formatCount,
  formatMonth,
  joinMetricLabels,
  pagesPerVisitor,
  percentChange,
  toRunningTotal,
  trafficMonths,
  type TrafficMonth,
} from "@/lib/traffic";

describe("trafficMonths", () => {
  it("covers January to October 2026 with the logged numbers", () => {
    expect(trafficMonths).toHaveLength(10);
    expect(trafficMonths[0]).toEqual({ month: "2026-01", visitors: 1440, pageViews: 2050 });
    expect(trafficMonths.at(-1)).toEqual({ month: "2026-10", visitors: 1873, pageViews: 3690 });
  });

  it("is sorted oldest first with no duplicate months", () => {
    const keys = trafficMonths.map((row) => row.month);
    expect(keys).toEqual([...keys].sort());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never reports more visitors than page views", () => {
    for (const row of trafficMonths) {
      expect(row.visitors).toBeLessThanOrEqual(row.pageViews);
    }
  });
});

describe("formatMonth", () => {
  it("formats long, medium and short labels", () => {
    expect(formatMonth("2026-10", "long")).toBe("October 2026");
    expect(formatMonth("2026-10", "medium")).toBe("Oct 2026");
    expect(formatMonth("2026-10", "short")).toBe("Oct 26");
  });

  it("does not drift across the year boundary", () => {
    expect(formatMonth("2027-01", "long")).toBe("January 2027");
    expect(formatMonth("2026-12", "short")).toBe("Dec 26");
  });

  it("returns a malformed key unchanged", () => {
    expect(formatMonth("2026-13", "long")).toBe("2026-13");
    expect(formatMonth("oct", "short")).toBe("oct");
  });
});

describe("joinMetricLabels", () => {
  it("capitalizes only the first label", () => {
    expect(joinMetricLabels(["visitors", "pageViews"])).toBe("Visitors and page views");
    expect(joinMetricLabels(["pageViews"])).toBe("Page views");
  });
});

describe("pagesPerVisitor", () => {
  it("divides page views by visitors", () => {
    expect(pagesPerVisitor({ month: "2026-10", visitors: 1873, pageViews: 3690 })).toBeCloseTo(
      1.97,
      2,
    );
  });

  it("is null when there were no visitors", () => {
    expect(pagesPerVisitor({ month: "2026-10", visitors: 0, pageViews: 0 })).toBeNull();
  });
});

describe("toRunningTotal", () => {
  it("accumulates each metric and leaves the input alone", () => {
    const rows: TrafficMonth[] = [
      { month: "2026-10", visitors: 10, pageViews: 30 },
      { month: "2026-11", visitors: 5, pageViews: 20 },
      { month: "2026-12", visitors: 1, pageViews: 2 },
    ];
    expect(toRunningTotal(rows)).toEqual([
      { month: "2026-10", visitors: 10, pageViews: 30 },
      { month: "2026-11", visitors: 15, pageViews: 50 },
      { month: "2026-12", visitors: 16, pageViews: 52 },
    ]);
    expect(rows[1]).toEqual({ month: "2026-11", visitors: 5, pageViews: 20 });
  });
});

describe("percentChange", () => {
  it("computes growth and decline", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(75, 100)).toBe(-25);
  });

  it("is null with no baseline", () => {
    expect(percentChange(100, undefined)).toBeNull();
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("formatCount", () => {
  it("adds thousands separators", () => {
    expect(formatCount(1873)).toBe("1,873");
    expect(formatCount(8564)).toBe("8,564");
  });
});
