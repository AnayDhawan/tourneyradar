import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAuthenticatedPlayer } = vi.hoisted(() => ({ getAuthenticatedPlayer: vi.fn() }));
vi.mock('@/lib/supabase-server', () => ({ getAuthenticatedPlayer }));

import { DELETE, GET, POST } from './route';

type DbResult = { data?: unknown; error?: { code?: string; message: string } | null };

// A chainable stand-in for the supabase query builder: every method returns the
// builder, and awaiting it (or calling .single()) yields `result`.
function playerWith(result: DbResult) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'delete', 'eq']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: DbResult) => unknown) => resolve(result);
  return { playerId: 'p1', authUserId: 'u1', supabase: { from: vi.fn(() => builder) } };
}

function post(body: unknown) {
  return new NextRequest('http://localhost/api/wishlist', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  getAuthenticatedPlayer.mockReset();
});

describe('POST /api/wishlist', () => {
  it('creates the favourite', async () => {
    getAuthenticatedPlayer.mockResolvedValue(playerWith({ data: { tournament_id: 't1' }, error: null }));
    const res = await POST(post({ tournament_id: 't1' }));
    expect(res.status).toBe(201);
  });

  it('treats saving an already-saved tournament as success', async () => {
    getAuthenticatedPlayer.mockResolvedValue(
      playerWith({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "pk"' } }),
    );
    const res = await POST(post({ tournament_id: 't1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, already_saved: true });
  });

  it('does not return database error text to the caller', async () => {
    getAuthenticatedPlayer.mockResolvedValue(
      playerWith({ data: null, error: { code: '42P01', message: 'relation "player_favorite_tournaments" does not exist' } }),
    );
    const res = await POST(post({ tournament_id: 't1' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('player_favorite_tournaments');
  });

  it('rejects an oversized tournament_id', async () => {
    getAuthenticatedPlayer.mockResolvedValue(playerWith({ data: null, error: null }));
    const res = await POST(post({ tournament_id: 'x'.repeat(101) }));
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    getAuthenticatedPlayer.mockResolvedValue(null);
    const res = await POST(post({ tournament_id: 't1' }));
    expect(res.status).toBe(401);
  });
});

describe('GET and DELETE /api/wishlist', () => {
  it('hides database error text on read', async () => {
    getAuthenticatedPlayer.mockResolvedValue(
      playerWith({ data: null, error: { message: 'permission denied for table player_favorite_tournaments' } }),
    );
    const res = await GET(new NextRequest('http://localhost/api/wishlist'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('player_favorite_tournaments');
  });

  it('hides database error text on delete', async () => {
    getAuthenticatedPlayer.mockResolvedValue(
      playerWith({ data: null, error: { message: 'permission denied for table player_favorite_tournaments' } }),
    );
    const res = await DELETE(new NextRequest('http://localhost/api/wishlist?tournament_id=t1', { method: 'DELETE' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('player_favorite_tournaments');
  });
});
