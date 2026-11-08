// A visit is one stretch of use: coming back within the gap, or opening another
// tab, is still the same visit.
export const VISIT_GAP_MS = 30 * 60 * 1000;

// The first visit is for using the site, so feedback waits for the second.
export const FEEDBACK_MIN_VISITS = 2;

export function nextVisitCount(visits: number, lastVisitAt: number, now: number): number {
  const count = Number.isFinite(visits) && visits > 0 ? visits : 0;
  const isSameVisit = count > 0 && lastVisitAt > 0 && now - lastVisitAt <= VISIT_GAP_MS;
  return isSameVisit ? count : count + 1;
}
