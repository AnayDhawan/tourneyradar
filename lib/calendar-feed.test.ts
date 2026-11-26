import { describe, expect, it } from 'vitest';
import {
  buildWishlistIcs,
  feedPath,
  feedTokensMatch,
  generateFeedToken,
  isValidFeedToken,
  tokenFromParam,
} from './calendar-feed';

describe('generateFeedToken', () => {
  it('is 43 url-safe characters (32 random bytes, base64url, no padding)', () => {
    const token = generateFeedToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isValidFeedToken(token)).toBe(true);
  });

  it('never repeats across many draws', () => {
    const tokens = new Set(Array.from({ length: 2000 }, () => generateFeedToken()));
    expect(tokens.size).toBe(2000);
  });

  it('uses the whole alphabet, not a narrow subset', () => {
    const chars = new Set(Array.from({ length: 200 }, () => generateFeedToken()).join(''));
    expect(chars.size).toBeGreaterThan(55);
  });
});

describe('isValidFeedToken', () => {
  it('rejects wrong lengths, padding, separators and other characters', () => {
    const good = generateFeedToken();
    expect(isValidFeedToken('')).toBe(false);
    expect(isValidFeedToken(good.slice(1))).toBe(false);
    expect(isValidFeedToken(`${good}a`)).toBe(false);
    expect(isValidFeedToken(`${good.slice(0, 42)}=`)).toBe(false);
    expect(isValidFeedToken(`${good.slice(0, 42)}/`)).toBe(false);
    expect(isValidFeedToken(`${good.slice(0, 42)}\n`)).toBe(false);
    expect(isValidFeedToken(`${good.slice(0, 41)}%2F`)).toBe(false);
  });
});

describe('feedTokensMatch', () => {
  it('matches equal tokens and rejects any difference or length mismatch', () => {
    const token = generateFeedToken();
    expect(feedTokensMatch(token, token)).toBe(true);
    expect(feedTokensMatch(token, generateFeedToken())).toBe(false);
    expect(feedTokensMatch(token, token.slice(0, 42))).toBe(false);
    expect(feedTokensMatch(token, '')).toBe(false);
  });
});

describe('feedPath and tokenFromParam', () => {
  it('round-trips a token through the URL path', () => {
    const token = generateFeedToken();
    const path = feedPath(token);
    expect(path).toBe(`/api/calendar/wishlist/${token}.ics`);
    expect(tokenFromParam(`${token}.ics`)).toBe(token);
    expect(tokenFromParam(`${token}.ICS`)).toBe(token);
    expect(tokenFromParam(token)).toBe(token);
  });
});

describe('buildWishlistIcs', () => {
  const now = new Date('2026-11-26T10:00:00Z');
  const base = {
    id: 'cr_1',
    name: 'Spring Open',
    date: '2027-03-14',
    end_date: '2027-03-16',
    city: 'Newark, Delaware',
    state: null,
    country: 'United States',
  };

  it('is a well-formed calendar with CRLF line endings and a final newline', () => {
    const ics = buildWishlistIcs([base], { siteUrl: 'https://example.test', now });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(ics).toContain('X-WR-CALNAME:My TourneyRadar wishlist');
    expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT12H');
  });

  it('emits one all-day event per tournament with an exclusive end date', () => {
    const ics = buildWishlistIcs([base], { siteUrl: 'https://example.test', now }).replace(/\r\n /g, '');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain('UID:tournament-cr_1@tourneyradar.com');
    expect(ics).toContain('DTSTAMP:20261126T100000Z');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270314');
    expect(ics).toContain('DTEND;VALUE=DATE:20270317');
    expect(ics).toContain('Link: https://example.test/tournaments/cr_1');
  });

  it('escapes text values', () => {
    const ics = buildWishlistIcs([{ ...base, name: 'A; B, C' }], {
      siteUrl: 'https://example.test',
      now,
    }).replace(/\r\n /g, '');
    expect(ics).toContain('SUMMARY:A\\; B\\, C');
    expect(ics).toContain('LOCATION:Newark\\, Delaware\\, United States');
  });

  it('uses a single day when there is no end date', () => {
    const ics = buildWishlistIcs([{ ...base, end_date: null }], {
      siteUrl: 'https://example.test',
      now,
    });
    expect(ics).toContain('DTEND;VALUE=DATE:20270315');
  });

  it('is a valid empty calendar for an empty wishlist', () => {
    const ics = buildWishlistIcs([], { siteUrl: 'https://example.test', now });
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
