import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCountdown, isNewTournament } from './countdown';

// "Now" is fixed so every boundary is exact.
const NOW = new Date('2026-10-21T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => vi.useRealTimers());

describe('getCountdown', () => {
  it('is empty once the event has started', () => {
    expect(getCountdown('2026-10-21T11:59:59Z')).toBe('');
    expect(getCountdown('2026-10-01')).toBe('');
  });

  it('says "Starting today!" for the same instant and for the next hour', () => {
    expect(getCountdown('2026-10-21T12:00:00Z')).toBe('Starting today!');
    expect(getCountdown('2026-10-21T12:59:59Z')).toBe('Starting today!');
  });

  it('counts hours later the same day', () => {
    expect(getCountdown('2026-10-21T13:00:00Z')).toBe('Starting in 1h');
    expect(getCountdown('2026-10-21T23:59:00Z')).toBe('Starting in 11h');
  });

  it('says "Tomorrow" from 24 to 47 hours away', () => {
    expect(getCountdown('2026-10-22T12:00:00Z')).toBe('Tomorrow');
    expect(getCountdown('2026-10-23T11:59:00Z')).toBe('Tomorrow');
  });

  it('counts days up to a week, then weeks up to a month, then months', () => {
    expect(getCountdown('2026-10-23T12:00:00Z')).toBe('In 2 days');
    expect(getCountdown('2026-10-28T12:00:00Z')).toBe('In 7 days');
    expect(getCountdown('2026-10-29T12:00:00Z')).toBe('In 2 weeks');
    expect(getCountdown('2026-11-20T12:00:00Z')).toBe('In 5 weeks');
    expect(getCountdown('2026-11-21T12:00:00Z')).toBe('In 2 months');
    expect(getCountdown('2027-04-21T12:00:00Z')).toBe('In 7 months');
  });

  it('reads a plain date as midnight UTC, not local time', () => {
    // 2026-10-22 is 12 hours after NOW (midnight UTC), so it is still "Starting in 12h".
    expect(getCountdown('2026-10-22')).toBe('Starting in 12h');
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
