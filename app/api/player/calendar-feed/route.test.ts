import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAuthenticatedPlayer, getFeedToken, ensureFeedToken, rotateFeedToken } = vi.hoisted(() => ({
  getAuthenticatedPlayer: vi.fn(),
  getFeedToken: vi.fn(),
  ensureFeedToken: vi.fn(),
  rotateFeedToken: vi.fn(),
}));
vi.mock('@/lib/supabase-server', () => ({ getAuthenticatedPlayer }));
vi.mock('@/lib/calendar-feed-server', () => ({ getFeedToken, ensureFeedToken, rotateFeedToken }));

import { generateFeedToken } from '@/lib/calendar-feed';
import { GET, POST, PUT } from './route';

const url = 'http://localhost/api/player/calendar-feed';
const req = (method: string, query = '') => new NextRequest(url + query, { method });

beforeEach(() => {
  getAuthenticatedPlayer.mockResolvedValue({ playerId: 'p1', authUserId: 'u1', supabase: {} });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const m of [getAuthenticatedPlayer, getFeedToken, ensureFeedToken, rotateFeedToken]) m.mockReset();
});

describe('/api/player/calendar-feed', () => {
  it('rejects every method without a valid token', async () => {
    getAuthenticatedPlayer.mockResolvedValue(null);
    for (const handler of [GET, POST, PUT]) {
      const res = await handler(req('X'));
      expect(res.status).toBe(401);
    }
    expect(getFeedToken).not.toHaveBeenCalled();
    expect(ensureFeedToken).not.toHaveBeenCalled();
    expect(rotateFeedToken).not.toHaveBeenCalled();
  });

  it('GET returns null before the feed is enabled, and the path after', async () => {
    getFeedToken.mockResolvedValueOnce(null);
    expect(await (await GET(req('GET'))).json()).toEqual({ path: null });

    const token = generateFeedToken();
    getFeedToken.mockResolvedValueOnce(token);
    const res = await GET(req('GET'));
    expect(await res.json()).toEqual({ path: `/api/calendar/wishlist/${token}.ics` });
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('POST enables the feed for the verified player only, ignoring a player_id in the query', async () => {
    const token = generateFeedToken();
    ensureFeedToken.mockResolvedValue(token);
    const res = await POST(req('POST', '?player_id=someone-else'));

    expect(res.status).toBe(200);
    expect(ensureFeedToken).toHaveBeenCalledWith('p1');
    expect((await res.json()).path).toContain(token);
  });

  it('PUT regenerates and returns the new path', async () => {
    const token = generateFeedToken();
    rotateFeedToken.mockResolvedValue(token);
    const res = await PUT(req('PUT'));

    expect(res.status).toBe(200);
    expect(rotateFeedToken).toHaveBeenCalledWith('p1');
    expect((await res.json()).path).toBe(`/api/calendar/wishlist/${token}.ics`);
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('answers 500 without leaking the error text or a token', async () => {
    const token = generateFeedToken();
    rotateFeedToken.mockRejectedValue(new Error('calendar feed rotate failed (42501)'));
    const res = await PUT(req('PUT'));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('42501');
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(token);
  });
});
