import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCountdown, isNewTournament } from './countdown';

// "Now" is fixed so every boundary is exact. It is noon UTC on 2026-10-21.
const NOW = new Date('2026-10-21T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => vi.useRealTimers());

describe('getCountdown', () => {
  it('is empty for a day that has already passed', () => {
    expect(getCountdown('2026-10-20')).toBe('');
    expect(getCountdown('2026-10-01')).toBe('');
  });

  it('says "Starting today!" for the whole of the event day', () => {
    expect(getCountdown('2026-10-21')).toBe('Starting today!');
    // Same date at any time of day, via the optional clock.
    expect(getCountdown('2026-10-24', new Date('2026-10-24T00:00:00Z'))).toBe('Starting today!');
    expect(getCountdown('2026-10-24', new Date('2026-10-24T09:00:00Z'))).toBe('Starting today!');
    expect(getCountdown('2026-10-24', new Date('2026-10-24T23:59:59Z'))).toBe('Starting today!');
  });

  it('says "Tomorrow" the day before, never hours to midnight', () => {
    expect(getCountdown('2026-10-22')).toBe('Tomorrow');
    expect(getCountdown('2026-10-24', new Date('2026-10-23T09:00:00Z'))).toBe('Tomorrow');
    expect(getCountdown('2026-10-24', new Date('2026-10-23T00:00:00Z'))).toBe('Tomorrow');
  });

  it('counts days up to a week', () => {
    expect(getCountdown('2026-10-23')).toBe('In 2 days');
    expect(getCountdown('2026-10-28')).toBe('In 7 days');
  });

  it('counts weeks up to 30 days', () => {
    expect(getCountdown('2026-10-29')).toBe('In 2 weeks');
    expect(getCountdown('2026-11-20')).toBe('In 5 weeks');
  });

  it('counts whole months beyond 30 days and does not round up', () => {
    // 31 days away is 1 month, not 2.
    expect(getCountdown('2026-11-21')).toBe('In 1 month');
    expect(getCountdown('2026-11-23', new Date('2026-10-23T00:00:00Z'))).toBe('In 1 month');
    // 60 days away is 2 months.
    expect(getCountdown('2026-12-20')).toBe('In 2 months');
    expect(getCountdown('2027-04-21')).toBe('In 6 months');
  });

  it('reads a plain date as a calendar day, not as a time', () => {
    expect(getCountdown('2026-10-22')).not.toMatch(/\dh/);
  });

  it('depends on the instant, not the timezone it is written in', () => {
    // Both are the same instant: 2026-10-23T12:00:00Z.
    expect(getCountdown('2026-10-23T14:00:00+02:00')).toBe(getCountdown('2026-10-23T12:00:00Z'));
    expect(getCountdown('2026-10-23T05:00:00-07:00')).toBe('In 2 days');
  });

  it('returns an empty string for a date it cannot read', () => {
    expect(getCountdown('not a date')).toBe('');
  });
});

describe('isNewTournament', () => {
  it('is true for something created within the last 7 days, inclusive', () => {
    expect(isNewTournament('2026-10-21T11:00:00Z')).toBe(true);
    expect(isNewTournament('2026-10-14T12:00:00Z')).toBe(true);
  });

  it('is false just past 7 days', () => {
    expect(isNewTournament('2026-10-14T11:59:59Z')).toBe(false);
    expect(isNewTournament('2026-01-01')).toBe(false);
  });

  it('is false for an empty value', () => {
    expect(isNewTournament('')).toBe(false);
  });
});
