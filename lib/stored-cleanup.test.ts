import { describe, expect, it } from 'vitest';

import { latestPlausibleStartDate } from './dates';
import { COUNTRY_COORDINATES } from './geocoding';
import { groupByLocation, isAtCountryCentroid, isCountryLevelAnswer, type CentroidRow } from './stored-cleanup';

const row = (over: Partial<CentroidRow>): CentroidRow => ({
  id: 'cr_1',
  name: 'Open',
  city: 'Hamburg',
  country: 'Germany',
  country_code: 'DE',
  lat: COUNTRY_COORDINATES.DE.lat,
  lng: COUNTRY_COORDINATES.DE.lng,
  ...over,
});

describe('latestPlausibleStartDate', () => {
  it('is the same calendar day two years on', () => {
    expect(latestPlausibleStartDate('2026-11-04')).toBe('2028-11-04');
  });

  it('puts every live bad date found on 2026-11-04 past the limit', () => {
    const limit = latestPlausibleStartDate('2026-11-04');
    for (const bad of ['2032-09-04', '2083-04-29', '2926-10-03']) expect(bad > limit).toBe(true);
  });
});

describe('isAtCountryCentroid', () => {
  it('is true for a row exactly on its country centroid', () => {
    expect(isAtCountryCentroid(row({}))).toBe(true);
  });

  it('is false for a real geocode, even one nearby', () => {
    expect(isAtCountryCentroid(row({ lat: 53.5511, lng: 9.9937 }))).toBe(false);
    expect(isAtCountryCentroid(row({ lat: COUNTRY_COORDINATES.DE.lat + 0.001 }))).toBe(false);
  });

  it("is false on another country's centroid, a missing coordinate, or a country without one", () => {
    expect(isAtCountryCentroid(row({ country_code: 'FR' }))).toBe(false);
    expect(isAtCountryCentroid(row({ lat: null }))).toBe(false);
    expect(isAtCountryCentroid(row({ country_code: 'NP' }))).toBe(false);
    expect(isAtCountryCentroid(row({ country_code: null }))).toBe(false);
  });
});

describe('groupByLocation', () => {
  it('groups rows by city and country, ignoring case and spacing', () => {
    const groups = groupByLocation([
      row({ id: 'a', city: 'Hamburg' }),
      row({ id: 'b', city: ' hamburg ' }),
      row({ id: 'c', city: 'Nauen' }),
      row({ id: 'd', city: 'Hamburg', country_code: 'US' }),
    ]);
    expect(groups.size).toBe(3);
    expect(groups.get('hamburg|DE')?.map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('isCountryLevelAnswer', () => {
  it("treats Google's own country centroid as no answer", () => {
    // What Google returned for "TBD, Canada" on 2026-11-04.
    expect(isCountryLevelAnswer('CA', 56.130366, -106.346771)).toBe(true);
  });

  it('accepts a real place', () => {
    expect(isCountryLevelAnswer('CA', 43.5853, -79.645)).toBe(false);
    expect(isCountryLevelAnswer('NP', 27.7, 85.3)).toBe(false);
  });
});
