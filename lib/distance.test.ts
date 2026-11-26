import { describe, expect, it } from 'vitest';
import {
  compareDistance,
  formatDistance,
  hasCoordinates,
  haversineKm,
  sortByDistance,
} from './distance';

const LONDON = { lat: 51.5074, lng: -0.1278 };
const PARIS = { lat: 48.8566, lng: 2.3522 };
const NEW_YORK = { lat: 40.7128, lng: -74.006 };

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(LONDON, LONDON)).toBe(0);
  });

  it('matches known city distances', () => {
    // London to Paris is about 344 km; London to New York about 5570 km.
    expect(haversineKm(LONDON, PARIS)).toBeCloseTo(343.6, 0);
    expect(haversineKm(LONDON, NEW_YORK)).toBeGreaterThan(5560);
    expect(haversineKm(LONDON, NEW_YORK)).toBeLessThan(5580);
  });

  it('is symmetric', () => {
    expect(haversineKm(LONDON, PARIS)).toBeCloseTo(haversineKm(PARIS, LONDON), 9);
  });

  it('handles the antimeridian and the poles', () => {
    // One degree of longitude on the equator is about 111.2 km, across +-180 too.
    expect(haversineKm({ lat: 0, lng: 179.5 }, { lat: 0, lng: -179.5 })).toBeCloseTo(111.2, 0);
    // Pole to pole is half the circumference, and must not be NaN.
    const poles = haversineKm({ lat: 90, lng: 0 }, { lat: -90, lng: 0 });
    expect(poles).toBeCloseTo(20015.1, 0);
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(20015.1, 0);
  });
});

describe('hasCoordinates', () => {
  it('accepts a finite in-range pair, including zero', () => {
    expect(hasCoordinates({ lat: 0, lng: 0 })).toBe(true);
    expect(hasCoordinates(LONDON)).toBe(true);
  });

  it('rejects missing, null, NaN and out-of-range values', () => {
    expect(hasCoordinates({})).toBe(false);
    expect(hasCoordinates({ lat: 10 })).toBe(false);
    expect(hasCoordinates({ lat: null, lng: null })).toBe(false);
    expect(hasCoordinates({ lat: Number.NaN, lng: 1 })).toBe(false);
    expect(hasCoordinates({ lat: 91, lng: 0 })).toBe(false);
    expect(hasCoordinates({ lat: 0, lng: -181 })).toBe(false);
  });
});

describe('compareDistance', () => {
  it('orders by distance and puts null last', () => {
    expect(compareDistance(1, 2)).toBeLessThan(0);
    expect(compareDistance(2, 1)).toBeGreaterThan(0);
    expect(compareDistance(5, 5)).toBe(0);
    expect(compareDistance(null, 1)).toBeGreaterThan(0);
    expect(compareDistance(1, null)).toBeLessThan(0);
    expect(compareDistance(null, null)).toBe(0);
  });
});

describe('sortByDistance', () => {
  const rows = [
    { id: 'ny', ...NEW_YORK },
    { id: 'none-1' },
    { id: 'paris', ...PARIS },
    { id: 'null', lat: null, lng: null },
    { id: 'london', ...LONDON },
  ];

  it('sorts nearest first and rows without coordinates last, in their original order', () => {
    const sorted = sortByDistance(rows, LONDON);
    expect(sorted.map((r) => r.item.id)).toEqual(['london', 'paris', 'ny', 'none-1', 'null']);
    expect(sorted[0].distanceKm).toBe(0);
    expect(sorted[3].distanceKm).toBeNull();
    expect(sorted[4].distanceKm).toBeNull();
  });

  it('changes the order with the origin', () => {
    const fromNewYork = sortByDistance(rows, NEW_YORK).map((r) => r.item.id);
    expect(fromNewYork.slice(0, 3)).toEqual(['ny', 'london', 'paris']);
  });

  it('keeps the original order for equal distances and does not mutate the input', () => {
    const same = [
      { id: 'a', ...PARIS },
      { id: 'b', ...PARIS },
    ];
    const copy = [...rows];
    expect(sortByDistance(same, LONDON).map((r) => r.item.id)).toEqual(['a', 'b']);
    sortByDistance(rows, PARIS);
    expect(rows).toEqual(copy);
  });

  it('returns an empty list for no rows', () => {
    expect(sortByDistance([], LONDON)).toEqual([]);
  });
});

describe('formatDistance', () => {
  it('scales precision with size', () => {
    expect(formatDistance(0.4)).toBe('<1 km');
    expect(formatDistance(4.26)).toBe('4.3 km');
    expect(formatDistance(379.6)).toBe('380 km');
  });
});
