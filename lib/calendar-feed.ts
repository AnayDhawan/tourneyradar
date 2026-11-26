import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  buildCalendar,
  icsDtstamp,
  tournamentToVEvent,
  type IcsTournament,
} from '@/lib/ics-feed';

// Server-only: uses node:crypto. Token and feed helpers for the private
// wishlist calendar feed. The database access lives in lib/calendar-feed-server.ts
// so everything here stays testable without a Supabase client.

// 32 bytes from the OS CSPRNG, base64url encoded: 256 bits, 43 characters.
const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const WISHLIST_FEED_PATH_PREFIX = '/api/calendar/wishlist/';

export function generateFeedToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

// Cheap shape check done before touching the database, so junk in the URL never
// becomes a query.
export function isValidFeedToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

// Constant-time comparison for the token the database returned against the one
// in the URL. Both are checked for length first because timingSafeEqual throws
// on unequal lengths (the length is not a secret: every token is 43 characters).
export function feedTokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

// Path (no origin) of the subscribe URL. The caller adds the origin it is
// served from.
export function feedPath(token: string): string {
  return `${WISHLIST_FEED_PATH_PREFIX}${token}.ics`;
}

// The route param is `<token>.ics`; calendar apps are happy with or without the
// suffix, so accept both.
export function tokenFromParam(param: string): string {
  return param.replace(/\.ics$/i, '');
}

export function buildWishlistIcs(
  tournaments: IcsTournament[],
  options: { siteUrl: string; now?: Date }
): string {
  const dtstamp = icsDtstamp(options.now ?? new Date());
  return buildCalendar({
    calName: 'My TourneyRadar wishlist',
    events: tournaments.map((t) => tournamentToVEvent(t, { siteUrl: options.siteUrl, dtstamp })),
    // Hint, honoured by some clients (Apple, Outlook): check back every 12 hours.
    extraHeaders: ['REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H'],
  });
}
