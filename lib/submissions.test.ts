import { describe, expect, it } from 'vitest';
import {
  PENDING_STATUS,
  clientAddress,
  createRateLimiter,
  isAcceptableLink,
  parseSubmission,
} from './submissions';
import { checkCronAuth } from './cron-auth';

const TODAY = '2026-11-02';

const valid = {
  name: 'Harbour Club Rapid 2026',
  date: '2026-12-05',
  end_date: '',
  city: 'Valletta',
  country_code: 'MT',
  category: 'Rapid',
  fide_rated: false,
  organizer_name: 'Harbour Chess Club',
  organizer_email: '',
  external_link: '',
  website: '',
};

function errorsOf(overrides: Record<string, unknown>) {
  const result = parseSubmission({ ...valid, ...overrides }, TODAY);
  if (result.ok || result.spam) throw new Error('expected validation errors');
  return result.errors;
}

describe('parseSubmission', () => {
  it('accepts a minimal valid submission and always marks it pending', () => {
    const result = parseSubmission(valid, TODAY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row).toMatchObject({
      name: 'Harbour Club Rapid 2026',
      date: '2026-12-05',
      end_date: '2026-12-05',
      country: 'Malta',
      country_code: 'MT',
      category: 'Rapid',
      organizer_email: null,
      external_link: null,
      source: 'submission',
      status: PENDING_STATUS,
    });
  });

  it('ignores any status the client tries to send', () => {
    const result = parseSubmission({ ...valid, status: 'published', id: 'cr_1' }, TODAY);
    expect(result.ok && result.row.status).toBe('pending');
    expect(result.ok && 'id' in result.row).toBe(false);
  });

  it('normalises whitespace and lower-case country codes', () => {
    const result = parseSubmission({ ...valid, name: '  Harbour   Club  Rapid ', country_code: 'mt' }, TODAY);
    expect(result.ok && result.row.name).toBe('Harbour Club Rapid');
    expect(result.ok && result.row.country_code).toBe('MT');
  });

  it('keeps an optional end date, link and email when they are valid', () => {
    const result = parseSubmission(
      { ...valid, end_date: '2026-12-06', external_link: 'https://club.example/rapid?id=3', organizer_email: 'a@club.example' },
      TODAY
    );
    expect(result.ok && result.row).toMatchObject({
      end_date: '2026-12-06',
      external_link: 'https://club.example/rapid?id=3',
      organizer_email: 'a@club.example',
    });
  });

  it('treats a filled honeypot as spam without listing errors', () => {
    expect(parseSubmission({ ...valid, website: 'https://spam.example' }, TODAY)).toEqual({ ok: false, spam: true });
  });

  it('rejects bodies that are not objects', () => {
    for (const body of [null, 'x', 5, [], undefined]) {
      const result = parseSubmission(body, TODAY);
      expect(result.ok || result.spam).toBe(false);
    }
  });

  it.each([
    ['name too short', { name: 'ab' }, 'name'],
    ['name with markup', { name: 'Open <script>' }, 'name'],
    ['name with a control character', { name: 'Open\u0007' }, 'name'],
    ['missing city', { city: ' ' }, 'city'],
    ['missing organizer', { organizer_name: '' }, 'organizer_name'],
    ['unknown country', { country_code: 'ZZ' }, 'country_code'],
    ['country name instead of a code', { country_code: 'Malta' }, 'country_code'],
    ['unknown category', { category: 'Bughouse' }, 'category'],
    ['fide_rated not a boolean', { fide_rated: 'yes' }, 'fide_rated'],
    ['past start date', { date: '2026-11-01' }, 'date'],
    ['impossible start date', { date: '2026-02-30' }, 'date'],
    ['start date years away', { date: '2999-01-01' }, 'date'],
    ['end before start', { end_date: '2026-12-01' }, 'end_date'],
    ['event longer than 31 days', { end_date: '2027-02-01' }, 'end_date'],
    ['javascript link', { external_link: 'javascript:alert(1)' }, 'external_link'],
    ['link with credentials', { external_link: 'https://user:pw@club.example/' }, 'external_link'],
    ['bad email', { organizer_email: 'not-an-email' }, 'organizer_email'],
  ])('rejects %s', (_label, overrides, field) => {
    expect(errorsOf(overrides)[field]).toBeTruthy();
  });

  it('accepts today as a start date', () => {
    expect(parseSubmission({ ...valid, date: TODAY }, TODAY).ok).toBe(true);
  });

  it('reports every bad field at once', () => {
    const errors = errorsOf({ name: '', city: '', category: 'x' });
    expect(Object.keys(errors).sort()).toEqual(['category', 'city', 'name']);
  });
});

describe('isAcceptableLink', () => {
  it('accepts plain http and https URLs only', () => {
    expect(isAcceptableLink('https://a.example/x')).toBe(true);
    expect(isAcceptableLink('http://a.example')).toBe(true);
    expect(isAcceptableLink('ftp://a.example')).toBe(false);
    expect(isAcceptableLink('a.example')).toBe(false);
    expect(isAcceptableLink(`https://a.example/${'x'.repeat(500)}`)).toBe(false);
  });
});

describe('clientAddress', () => {
  const headers = (map: Record<string, string>) => ({ get: (name: string) => map[name] ?? null });

  it('uses the first forwarded address, then x-real-ip, then "unknown"', () => {
    expect(clientAddress(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientAddress(headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientAddress(headers({}))).toBe('unknown');
  });
});

describe('createRateLimiter', () => {
  it('allows the limit, blocks the next request, and resets after the window', () => {
    const limiter = createRateLimiter(2, 1000);

    expect(limiter.take('a', 0)).toBe(true);
    expect(limiter.take('a', 10)).toBe(true);
    expect(limiter.take('a', 20)).toBe(false);
    expect(limiter.take('b', 20)).toBe(true);
    expect(limiter.take('a', 1000)).toBe(true);
  });

  it('sweeps expired keys', () => {
    const limiter = createRateLimiter(1, 100);
    limiter.take('a', 0);
    limiter.sweep(500);
    expect(limiter.take('a', 501)).toBe(true);
  });
});

describe('checkCronAuth', () => {
  it('fails closed when no secret is configured', () => {
    expect(checkCronAuth('Bearer anything', undefined)).toBe('not-configured');
    expect(checkCronAuth(null, '')).toBe('not-configured');
  });

  it('accepts only the exact bearer token', () => {
    expect(checkCronAuth('Bearer s3cret', 's3cret')).toBe('ok');
    expect(checkCronAuth('Bearer s3creT', 's3cret')).toBe('unauthorized');
    expect(checkCronAuth('s3cret', 's3cret')).toBe('unauthorized');
    expect(checkCronAuth(null, 's3cret')).toBe('unauthorized');
    expect(checkCronAuth('Bearer s3cret-and-more', 's3cret')).toBe('unauthorized');
  });
});
