import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAuthenticatedPlayer, deletePlayerAccount } = vi.hoisted(() => ({
  getAuthenticatedPlayer: vi.fn(),
  deletePlayerAccount: vi.fn(),
}));
vi.mock('@/lib/supabase-server', () => ({ getAuthenticatedPlayer, deletePlayerAccount }));

import { DELETE } from './route';

function del(body: unknown = { confirm: true }) {
  return new NextRequest('http://localhost/api/player/account', {
    method: 'DELETE',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  getAuthenticatedPlayer.mockResolvedValue({ playerId: 'p1', authUserId: 'u1', supabase: {} });
  deletePlayerAccount.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  getAuthenticatedPlayer.mockReset();
  deletePlayerAccount.mockReset();
});

describe('DELETE /api/player/account', () => {
  it('rejects a caller with no valid token', async () => {
    getAuthenticatedPlayer.mockResolvedValue(null);

    const response = await DELETE(del());

    expect(response.status).toBe(401);
    expect(deletePlayerAccount).not.toHaveBeenCalled();
  });

  it('requires an explicit confirmation', async () => {
    const response = await DELETE(del({ confirm: 'yes' }));

    expect(response.status).toBe(400);
    expect(deletePlayerAccount).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON', async () => {
    const response = await DELETE(del('not json'));

    expect(response.status).toBe(400);
    expect(deletePlayerAccount).not.toHaveBeenCalled();
  });

  it('deletes the account using the verified ids, ignoring ids in the body', async () => {
    const response = await DELETE(del({ confirm: true, player_id: 'someone-else' }));

    expect(response.status).toBe(200);
    expect(deletePlayerAccount).toHaveBeenCalledWith({ playerId: 'p1', authUserId: 'u1' });
  });

  it('reports a database failure and keeps email addresses out of the log', async () => {
    deletePlayerAccount.mockRejectedValue(new Error('player row: duplicate for ana@example.com'));

    const response = await DELETE(del());

    expect(response.status).toBe(500);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain('ana@example.com');
    expect(logged).toContain('[redacted-email]');
  });
});
