import { describe, expect, it } from 'vitest';
import { MAX_PAGE_LIMIT, parseBounded, parseUpcomingBody } from './api-params';

describe('parseBounded', () => {
  it('treats a missing or empty value as "not provided"', () => {
    expect(parseBounded(null, 'limit')).toEqual({});
    expect(parseBounded('', 'limit')).toEqual({});
  });

  it('accepts a positive integer', () => {
    expect(parseBounded('1', 'page')).toEqual({ value: 1 });
    expect(parseBounded('200', 'limit')).toEqual({ value: 200 });
  });

  it('rejects zero, negatives, decimals and non-numbers', () => {
    for (const raw of ['0', '-5', '1.5', 'abc', '10abc', ' 7', '1e3']) {
      expect(parseBounded(raw, 'limit')).toEqual({ error: 'limit must be a positive integer' });
    }
  });

  it('rejects a number too large to be a safe integer', () => {
    expect(parseBounded('99999999999999999999', 'page')).toEqual({
      error: 'page must be a positive integer',
    });
  });

  it('names the parameter in the error', () => {
    expect(parseBounded('abc', 'page').error).toBe('page must be a positive integer');
  });
});

describe('parseUpcomingBody', () => {
  it('fills in the defaults for an empty object', () => {
    expect(parseUpcomingBody({})).toEqual({
      ok: true,
      value: { countries: undefined, category: undefined, page: 1, limit: 50 },
    });
  });

  it('clamps limit to the maximum and reports the value used', () => {
    const r = parseUpcomingBody({ limit: 100000 });
    expect(r.ok && r.value.limit).toBe(MAX_PAGE_LIMIT);
  });

  it('keeps valid countries and category', () => {
    const r = parseUpcomingBody({ countries: ['IN', 'US'], category: 'Blitz', page: 3, limit: 10 });
    expect(r).toEqual({
      ok: true,
      value: { countries: ['IN', 'US'], category: 'Blitz', page: 3, limit: 10 },
    });
  });

  it('rejects a body that is not a JSON object', () => {
    for (const body of [null, 'x', 5, true, [], [1, 2]]) {
      expect(parseUpcomingBody(body)).toEqual({
        ok: false,
        error: 'Request body must be a JSON object',
      });
    }
  });

  it('rejects countries that is not an array of non-empty strings', () => {
    for (const countries of ['IN', 5, [1], [''], ['IN', null], {}]) {
      expect(parseUpcomingBody({ countries })).toEqual({
        ok: false,
        error: 'countries must be an array of non-empty strings',
      });
    }
  });

  it('rejects an oversized countries list', () => {
    const countries = Array.from({ length: 301 }, () => 'IN');
    expect(parseUpcomingBody({ countries }).ok).toBe(false);
  });

  it('rejects a category that is not a string', () => {
    expect(parseUpcomingBody({ category: 7 })).toEqual({
      ok: false,
      error: 'category must be a string',
    });
  });

  it('rejects page or limit that are not positive integers', () => {
    for (const bad of [0, -1, 1.5, '5', null, NaN]) {
      expect(parseUpcomingBody({ page: bad }).ok).toBe(false);
      expect(parseUpcomingBody({ limit: bad }).ok).toBe(false);
    }
  });
});
