import { describe, expect, it } from 'vitest';
import { FEEDBACK_MIN_VISITS, nextVisitCount, VISIT_GAP_MS } from './visit-count';

const NOW = 1_800_000_000_000;

describe('nextVisitCount', () => {
  it('counts the first ever load as visit 1', () => {
    expect(nextVisitCount(0, 0, NOW)).toBe(1);
  });

  it('keeps a second tab or reload inside the gap on the same visit', () => {
    expect(nextVisitCount(1, NOW - 1000, NOW)).toBe(1);
    expect(nextVisitCount(1, NOW - VISIT_GAP_MS, NOW)).toBe(1);
  });

  it('counts a new visit once the gap has passed', () => {
    expect(nextVisitCount(1, NOW - VISIT_GAP_MS - 1, NOW)).toBe(2);
  });

  it('counts a new visit for a browser with a count but no timestamp yet', () => {
    expect(nextVisitCount(3, 0, NOW)).toBe(4);
  });

  it('treats a corrupt stored count as no visits', () => {
    expect(nextVisitCount(Number.NaN, NOW, NOW)).toBe(1);
  });

  it('does not reach the feedback threshold on a first visit', () => {
    expect(nextVisitCount(0, 0, NOW)).toBeLessThan(FEEDBACK_MIN_VISITS);
    expect(nextVisitCount(1, NOW - VISIT_GAP_MS - 1, NOW)).toBeGreaterThanOrEqual(FEEDBACK_MIN_VISITS);
  });
});
