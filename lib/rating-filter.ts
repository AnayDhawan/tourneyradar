// Rating-eligibility filter for the /tournaments list (issue #266).
//
// A tournament row carries an optional rating window: `min_rating` and
// `max_rating`, both nullable. A player can enter when their rating sits inside
// that window, bounds included.
//
//   min_rating  max_rating  meaning                       1450 can enter?
//   null        null        open event, no restriction    yes (always passes)
//   null        1600        "U1600"                       yes
//   1800        null        "1800+"                       no
//   1200        1600        a band                        yes
//
// A row with only one bound set is checked against that bound alone: a missing
// bound means "no limit on that side", never "unknown, hide it".

/** Smallest and largest rating the filter accepts. Anything else is invalid. */
export const MIN_FILTER_RATING = 100;
export const MAX_FILTER_RATING = 3500;

export interface RatingWindow {
  min_rating?: number | null;
  max_rating?: number | null;
}

// Number.isFinite also rejects NaN, so a corrupt bound counts as "no bound".
function bound(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * True when a player rated `rating` may enter a tournament with this window.
 * Pure: the same rule `ratingEligibilityFilters` expresses to the database.
 */
export function matchesRating(window: RatingWindow, rating: number): boolean {
  const min = bound(window.min_rating);
  const max = bound(window.max_rating);
  return (min === null || rating >= min) && (max === null || rating <= max);
}

/**
 * Turns user input or a stored value into a usable rating, or null when it is
 * empty, not a whole number, or outside MIN_FILTER_RATING..MAX_FILTER_RATING.
 * Accepts a number or a digit string (surrounding whitespace is ignored).
 */
export function normalizeRating(value: unknown): number | null {
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string' && /^\s*\d{1,5}\s*$/.test(value)) {
    n = Number(value.trim());
  } else {
    return null;
  }
  if (!Number.isInteger(n) || n < MIN_FILTER_RATING || n > MAX_FILTER_RATING) return null;
  return n;
}

/** What the `rating` URL parameter said. */
export interface RatingParam {
  /** The parameter appears in the URL at all, even with an empty value. */
  present: boolean;
  /** The validated rating to filter by, or null for no filtering. */
  rating: number | null;
  /** The parameter had a non-empty value that is not a valid rating. */
  invalid: boolean;
}

/**
 * Reads `?rating=`. Absent means "use the default" (a signed-in player's saved
 * rating); present but empty means the visitor chose to see everything; present
 * but invalid filters nothing and flags `invalid` so the page can say so.
 */
export function parseRatingParam(raw: string | string[] | undefined): RatingParam {
  if (raw === undefined) return { present: false, rating: null, invalid: false };
  const text = Array.isArray(raw) ? (raw[0] ?? '') : raw;
  if (text.trim() === '') return { present: true, rating: null, invalid: false };
  const rating = normalizeRating(text);
  return { present: true, rating, invalid: rating === null };
}

/**
 * The saved rating of a signed-in player, or null. `user` is whatever the auth
 * context holds (a player row, an admin row or nothing); only a player row with
 * a valid `rating` yields a number.
 */
export function savedRatingOf(user: unknown): number | null {
  if (typeof user !== 'object' || user === null || !('rating' in user)) return null;
  return normalizeRating((user as { rating: unknown }).rating);
}

/**
 * PostgREST `or` expressions for the database side of the filter. Chain them
 * with two `.or()` calls (which AND together): rows pass when
 * (min is null or min <= rating) and (max is null or max >= rating), the same
 * rule as `matchesRating`. `rating` must come from `normalizeRating`, so it is
 * a plain integer and safe to interpolate.
 */
export function ratingEligibilityFilters(rating: number): [string, string] {
  return [
    `min_rating.is.null,min_rating.lte.${rating}`,
    `max_rating.is.null,max_rating.gte.${rating}`,
  ];
}
