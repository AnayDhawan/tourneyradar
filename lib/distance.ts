// Great-circle distance and the "nearest first" ordering for /tournaments.
//
// Pure functions only. The viewer's position is passed in by the caller and
// never stored, logged or sent anywhere from here.

export interface Coordinates {
  lat: number;
  lng: number;
}

interface MaybeLocated {
  lat?: number | null;
  lng?: number | null;
}

const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Haversine distance between two points, in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  // Clamp: rounding can push h a hair above 1 for antipodal points.
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** True when the row carries a usable lat/lng pair (null, NaN and out-of-range all fail). */
export function hasCoordinates<T extends MaybeLocated>(
  item: T,
): item is T & Coordinates {
  const { lat, lng } = item;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/**
 * Comparator on distances where `null` (no coordinates) always sorts last.
 * Returns 0 for equal distances so Array.prototype.sort (stable) keeps the
 * original, date-ordered sequence for ties.
 */
export function compareDistance(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

export interface WithDistance<T> {
  item: T;
  /** Kilometres from the origin, or null when the row has no coordinates. */
  distanceKm: number | null;
}

/** New array ordered nearest first; rows without coordinates go last. Input is not mutated. */
export function sortByDistance<T extends MaybeLocated>(
  items: readonly T[],
  origin: Coordinates,
): WithDistance<T>[] {
  return items
    .map((item) => ({
      item,
      distanceKm: hasCoordinates(item) ? haversineKm(origin, item) : null,
    }))
    .sort((a, b) => compareDistance(a.distanceKm, b.distanceKm));
}

/** "<1 km", "4.2 km", "380 km". */
export function formatDistance(km: number): string {
  if (km < 1) return '<1 km';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
