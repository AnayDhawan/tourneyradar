import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authorizeAdmin, listPendingSubmissions } = vi.hoisted(() => ({
  authorizeAdmin: vi.fn(),
  listPendingSubmissions: vi.fn(),
}));
vi.mock('@/lib/admin-server', () => ({ authorizeAdmin }));
vi.mock('@/lib/moderation-server', () => ({ listPendingSubmissions }));

import { GET } from './route';

const get = () => new NextRequest('http://localhost/api/admin/submissions');

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  authorizeAdmin.mockReset();
  listPendingSubmissions.mockReset();
});

describe('GET /api/admin/submissions', () => {
  it('answers 401 to an unauthenticated caller and reads nothing', async () => {
    authorizeAdmin.mockResolvedValue({ ok: false, status: 401, error: 'Authentication required' });
    const res = await GET(get());

    expect(res.status).toBe(401);
    expect(listPendingSubmissions).not.toHaveBeenCalled();
  });

  it('answers 403 to a signed-in non-admin and reads nothing', async () => {
    authorizeAdmin.mockResolvedValue({ ok: false, status: 403, error: 'Admin access required' });
    const res = await GET(get());

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Admin access required' });
    expect(listPendingSubmissions).not.toHaveBeenCalled();
  });

  it('passes a gate failure through as a 500 without reading', async () => {
    authorizeAdmin.mockResolvedValue({ ok: false, status: 500, error: 'Could not verify admin access' });
    const res = await GET(get());

    expect(res.status).toBe(500);
    expect(listPendingSubmissions).not.toHaveBeenCalled();
  });

  it('lists the queue for an admin, uncached', async () => {
    authorizeAdmin.mockResolvedValue({ ok: true, authUserId: 'u1' });
    listPendingSubmissions.mockResolvedValue([{ id: 'submitted_x' }]);
    const res = await GET(get());

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ submissions: [{ id: 'submitted_x' }] });
  });

  it('reports a database failure as 500 without its text', async () => {
    authorizeAdmin.mockResolvedValue({ ok: true, authUserId: 'u1' });
    listPendingSubmissions.mockRejectedValue(new Error('relation tournament_submissions does not exist'));
    const res = await GET(get());

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('tournament_submissions');
  });
});
