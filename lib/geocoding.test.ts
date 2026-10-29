import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COUNTRY_COORDINATES, geocodeWithFallback } from './geocoding';

// A city that is not in the hardcoded table, in a country that has a centroid.
const UNKNOWN_CITY = 'Duisburg-test';

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

// The Nominatim client spaces its calls 1.1 s apart, so run on fake timers.
async function resolve<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

describe('geocodeWithFallback tier order', () => {
  const fetchMock = vi.fn();
  const originalKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchMock);
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalKey;
  });

  it('uses the city table without any network call', async () => {
    const result = await geocodeWithFallback('Mumbai', 'India', 'IN');
    expect(result?.tier).toBe('city_table');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks Nominatim before falling back to the country centroid', async () => {
    fetchMock.mockReturnValue(okJson([{ lat: '51.4344', lon: '6.7623' }]));

    const result = await resolve(geocodeWithFallback(UNKNOWN_CITY, 'Germany', 'DE'));

    expect(result).toEqual({ lat: 51.4344, lng: 6.7623, tier: 'nominatim' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('nominatim.openstreetmap.org');
  });

  it('asks Google first when a key is set', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    fetchMock.mockReturnValue(
      okJson({ status: 'OK', results: [{ geometry: { location: { lat: 51.43, lng: 6.76 } } }] })
    );

    const result = await resolve(geocodeWithFallback(UNKNOWN_CITY, 'Germany', 'DE'));

    expect(result).toEqual({ lat: 51.43, lng: 6.76, tier: 'google' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('maps.googleapis.com');
  });

  it('returns the centroid only after both network tiers come back empty', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    fetchMock
      .mockReturnValueOnce(okJson({ status: 'ZERO_RESULTS', results: [] }))
      .mockReturnValueOnce(okJson([]));

    const result = await resolve(geocodeWithFallback(UNKNOWN_CITY, 'Germany', 'DE'));

    expect(result).toEqual({ ...COUNTRY_COORDINATES.DE, tier: 'country_centroid' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns the centroid when the network is down', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await resolve(geocodeWithFallback(UNKNOWN_CITY, 'Germany', 'DE'));

    expect(result).toEqual({ ...COUNTRY_COORDINATES.DE, tier: 'country_centroid' });
    errorSpy.mockRestore();
  });

  it('returns the centroid directly when the city is just the country name', async () => {
    const result = await geocodeWithFallback('Germany', 'Germany', 'DE');
    expect(result).toEqual({ ...COUNTRY_COORDINATES.DE, tier: 'country_centroid' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null for a country without a centroid when every tier fails', async () => {
    fetchMock.mockReturnValue(okJson([]));
    const result = await resolve(geocodeWithFallback(UNKNOWN_CITY, 'Narnia', 'ZZ'));
    expect(result).toBeNull();
  });
});
