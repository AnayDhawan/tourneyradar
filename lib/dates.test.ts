import { describe, expect, it } from 'vitest';
import { isPlausibleStartDate } from './dates';

const TODAY = '2026-10-23';

describe('isPlausibleStartDate', () => {
  it('rejects typo and non-Gregorian years', () => {
    expect(isPlausibleStartDate('2926-10-03', TODAY)).toBe(false);
    expect(isPlausibleStartDate('2083-04-29', TODAY)).toBe(false);
    expect(isPlausibleStartDate('2032-09-04', TODAY)).toBe(false);
  });

  it('accepts today and dates within the window', () => {
    expect(isPlausibleStartDate('2026-10-23', TODAY)).toBe(true);
    expect(isPlausibleStartDate('2027-10-23', TODAY)).toBe(true);
  });

  it('treats the last day of the window as inclusive', () => {
    expect(isPlausibleStartDate('2028-10-23', TODAY)).toBe(true);
    expect(isPlausibleStartDate('2028-10-24', TODAY)).toBe(false);
  });

  it('honours a custom maxYearsAhead', () => {
    expect(isPlausibleStartDate('2027-10-23', TODAY, 1)).toBe(true);
    expect(isPlausibleStartDate('2027-10-24', TODAY, 1)).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isPlausibleStartDate('2026/10/23', TODAY)).toBe(false);
    expect(isPlausibleStartDate('', TODAY)).toBe(false);
  });
});
