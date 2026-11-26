import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { findPlayerIdByFeedToken, listFeedTournaments } = vi.hoisted(() => ({
  findPlayerIdByFeedToken: vi.fn(),
  listFeedTournaments: vi.fn(),
}));
vi.mock('@/lib/calendar-feed-server', () => ({ findPlayerIdByFeedToken, listFeedTournaments }));

import { generateFeedToken } from '@/lib/calendar-feed';
import { GET } from './route';

function get(param: string) {
  return GET(new Request(`http://localhost/api/calendar/wishlist/${param}`), {
    params: Promise.resolve({ token: param }),
  });
}

const tournament = {
  id: 't1',
  name: 'Spring Open',
  date: '2027-03-14',
  end_date: null,
  city: 'Newark',
  state: null,
  country: 'United States',
};

beforeEach(() => {
  findPlayerIdByFeedToken.mockResolvedValue('p1');
  listFeedTournaments.mockResolvedValue([tournament]);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  findPlayerIdByFeedToken.mockReset();
  listFeedTournaments.mockReset();
});

describe('GET /api/calendar/wishlist/[token]', () => {
  it('serves the player feed with private, no-store headers', async () => {
    const token = generateFeedToken();
    const res = await get(`${token}.ics`);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/calendar');
    const cache = res.headers.get('Cache-Control') ?? '';
    expect(cache).toContain('private');
    expect(cache).toContain('no-store');
    expect(cache).not.toContain('public');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(res.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(await res.text()).toContain('SUMMARY:Spring Open');
    expect(findPlayerIdByFeedToken).toHaveBeenCalledWith(token);
    expect(listFeedTournaments).toHaveBeenCalledWith('p1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('accepts the token without the .ics suffix', async () => {
    const token = generateFeedToken();
    expect((await get(token)).status).toBe(200);
  });

  it('answers 404 for a malformed token without touching the database', async () => {
    for (const bad of ['short.ics', 'x'.repeat(44), `${generateFeedToken().slice(0, 42)}=.ics`, 'US.ics']) {
      const res = await get(bad);
      expect(res.status).toBe(404);
    }
    expect(findPlayerIdByFeedToken).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown or regenerated token, with the same body as a malformed one', async () => {
    findPlayerIdByFeedToken.mockResolvedValue(null);
    const unknown = await get(`${generateFeedToken()}.ics`);
    const malformed = await get('nope.ics');

    expect(unknown.status).toBe(404);
    expect(await unknown.text()).toBe(await malformed.text());
    expect(unknown.headers.get('Cache-Control')).toContain('no-store');
    expect(listFeedTournaments).not.toHaveBeenCalled();
  });

  it('answers 500 on a database error and never logs the token', async () => {
    const token = generateFeedToken();
    findPlayerIdByFeedToken.mockRejectedValue(new Error('calendar feed lookup failed (57014)'));
    const res = await get(`${token}.ics`);

    expect(res.status).toBe(500);
    expect(res.headers.get('Cache-Control')).toContain('no-store');
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain(token);
  });
});
