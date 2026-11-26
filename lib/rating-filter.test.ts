import { describe, expect, it } from 'vitest';
import {
  matchesRating,
  normalizeRating,
  parseRatingParam,
  ratingEligibilityFilters,
  savedRatingOf,
} from './rating-filter';

const OPEN = { min_rating: null, max_rating: null };
const U1600 = { min_rating: null, max_rating: 1600 };
const U1400 = { min_rating: null, max_rating: 1400 };
const ONE800_PLUS = { min_rating: 1800, max_rating: null };
const BAND = { min_rating: 1200, max_rating: 1600 };

describe('matchesRating', () => {
  it('lets a 1450 player into U1600 and open events but not 1800+', () => {
    expect(matchesRating(U1600, 1450)).toBe(true);
    expect(matchesRating(OPEN, 1450)).toBe(true);
    expect(matchesRating(ONE800_PLUS, 1450)).toBe(false);
  });

  it('keeps a row with neither bound for every rating', () => {
    for (const rating of [100, 1450, 2800, 3500]) {
      expect(matchesRating(OPEN, rating)).toBe(true);
    }
    expect(matchesRating({}, 1450)).toBe(true);
  });

  it('checks only the max when only max_rating is set', () => {
    expect(matchesRating(U1400, 1450)).toBe(false);
    expect(matchesRating(U1400, 800)).toBe(true);
  });

  it('checks only the min when only min_rating is set', () => {
    expect(matchesRating(ONE800_PLUS, 2100)).toBe(true);
    expect(matchesRating({ min_rating: 1800 }, 1700)).toBe(false);
  });

  it('checks both ends of a band', () => {
    expect(matchesRating(BAND, 1450)).toBe(true);
    expect(matchesRating(BAND, 1100)).toBe(false);
    expect(matchesRating(BAND, 1700)).toBe(false);
  });

  it('includes the bounds themselves', () => {
    expect(matchesRating(BAND, 1200)).toBe(true);
    expect(matchesRating(BAND, 1600)).toBe(true);
    expect(matchesRating(BAND, 1199)).toBe(false);
    expect(matchesRating(BAND, 1601)).toBe(false);
  });

  it('treats a corrupt bound as no bound', () => {
    expect(matchesRating({ min_rating: Number.NaN, max_rating: 1600 }, 1450)).toBe(true);
    expect(matchesRating({ min_rating: 1000, max_rating: Number.NaN }, 2500)).toBe(true);
  });
});

describe('normalizeRating', () => {
  it('accepts whole numbers and digit strings in range', () => {
    expect(normalizeRating(1450)).toBe(1450);
    expect(normalizeRating('1450')).toBe(1450);
    expect(normalizeRating(' 1450 ')).toBe(1450);
    expect(normalizeRating(100)).toBe(100);
    expect(normalizeRating(3500)).toBe(3500);
  });

  it.each([
    ['empty string', ''],
    ['blank string', '   '],
    ['letters', 'abc'],
    ['mixed', '14a0'],
    ['decimal string', '1450.5'],
    ['negative', '-1450'],
    ['exponent', '1e3'],
    ['hex', '0x5ba'],
    ['below range', 99],
    ['above range', 3501],
    ['huge', '999999'],
    ['non-integer number', 1450.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['null', null],
    ['undefined', undefined],
    ['object', {}],
  ])('rejects %s', (_label, value) => {
    expect(normalizeRating(value)).toBeNull();
  });
});

describe('parseRatingParam', () => {
  it('reports an absent parameter so the saved rating can default in', () => {
    expect(parseRatingParam(undefined)).toEqual({ present: false, rating: null, invalid: false });
  });

  it('reads a valid rating', () => {
    expect(parseRatingParam('1450')).toEqual({ present: true, rating: 1450, invalid: false });
  });

  it('treats an empty value as an explicit "show everything"', () => {
    expect(parseRatingParam('')).toEqual({ present: true, rating: null, invalid: false });
    expect(parseRatingParam('  ')).toEqual({ present: true, rating: null, invalid: false });
  });

  it('flags a bad value and filters nothing', () => {
    expect(parseRatingParam('abc')).toEqual({ present: true, rating: null, invalid: true });
    expect(parseRatingParam('99999')).toEqual({ present: true, rating: null, invalid: true });
  });

  it('uses the first value of a repeated parameter', () => {
    expect(parseRatingParam(['1450', '2000'])).toEqual({ present: true, rating: 1450, invalid: false });
    expect(parseRatingParam([])).toEqual({ present: true, rating: null, invalid: false });
  });
});

describe('savedRatingOf', () => {
  it('returns a signed-in player\'s rating', () => {
    expect(savedRatingOf({ id: 'p1', rating: 1450 })).toBe(1450);
    expect(savedRatingOf({ id: 'p1', rating: '1450' })).toBe(1450);
  });

  it('returns null when there is nothing usable', () => {
    expect(savedRatingOf(null)).toBeNull();
    expect(savedRatingOf(undefined)).toBeNull();
    expect(savedRatingOf({ id: 'admin' })).toBeNull();
    expect(savedRatingOf({ rating: null })).toBeNull();
    expect(savedRatingOf({ rating: 0 })).toBeNull();
    expect(savedRatingOf('1450')).toBeNull();
  });
});

describe('ratingEligibilityFilters', () => {
  it('builds the two PostgREST or-clauses for the same rule as matchesRating', () => {
    expect(ratingEligibilityFilters(1450)).toEqual([
      'min_rating.is.null,min_rating.lte.1450',
      'max_rating.is.null,max_rating.gte.1450',
    ]);
  });
});
