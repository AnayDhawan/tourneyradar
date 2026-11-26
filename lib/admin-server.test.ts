import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase-server', () => ({
  bearerToken: (request: NextRequest) => {
    const header = request.headers.get('authorization');
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  },
  clientForToken: vi.fn(),
  serviceRoleClient: vi.fn(),
}));

import { authorizeAdmin, type AdminGateDeps } from './admin-server';

function request(authorization?: string) {
  return new NextRequest('http://localhost/api/admin/submissions', {
    headers: authorization ? { authorization } : {},
  });
}

function deps(overrides: Partial<AdminGateDeps> = {}) {
  const verifyToken = vi.fn<AdminGateDeps['verifyToken']>(async () => 'user-1');
  const isAdmin = vi.fn<AdminGateDeps['isAdmin']>(async () => true);
  const gate: AdminGateDeps = { verifyToken, isAdmin, ...overrides };
  return Object.assign(gate, { spies: { verifyToken, isAdmin } });
}

describe('authorizeAdmin', () => {
  it('lets a verified user who is in admins through', async () => {
    const d = deps();
    const result = await authorizeAdmin(request('Bearer good'), d);

    expect(result).toEqual({ ok: true, authUserId: 'user-1' });
    expect(d.spies.verifyToken).toHaveBeenCalledWith('good');
    expect(d.spies.isAdmin).toHaveBeenCalledWith('user-1');
  });

  it('answers 401 with no Authorization header and checks nothing', async () => {
    const d = deps();
    const result = await authorizeAdmin(request(), d);

    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(d.spies.verifyToken).not.toHaveBeenCalled();
    expect(d.spies.isAdmin).not.toHaveBeenCalled();
  });

  it('answers 401 for a header that is not a bearer token', async () => {
    const d = deps();
    expect(await authorizeAdmin(request('Basic abc'), d)).toMatchObject({ ok: false, status: 401 });
    expect(await authorizeAdmin(request('Bearer'), d)).toMatchObject({ ok: false, status: 401 });
    expect(d.spies.verifyToken).not.toHaveBeenCalled();
  });

  it('answers 401 for an invalid or expired token and never looks at admins', async () => {
    const d = deps({ verifyToken: async () => null });
    const result = await authorizeAdmin(request('Bearer expired'), d);

    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(d.spies.isAdmin).not.toHaveBeenCalled();
  });

  it('answers 403 for a signed-in user who is not an admin', async () => {
    const d = deps({ isAdmin: async () => false });
    const result = await authorizeAdmin(request('Bearer player'), d);

    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('fails closed when the admin lookup throws', async () => {
    const d = deps({
      isAdmin: async () => {
        throw new Error('connection refused');
      },
    });
    const result = await authorizeAdmin(request('Bearer good'), d);

    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(result.ok).toBe(false);
  });

  it('fails closed when token verification throws', async () => {
    const d = deps({
      verifyToken: async () => {
        throw new Error('auth down');
      },
    });
    const result = await authorizeAdmin(request('Bearer good'), d);

    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(d.spies.isAdmin).not.toHaveBeenCalled();
  });

  it('treats anything but an explicit true from the lookup as not admin', async () => {
    const d = deps({ isAdmin: async () => undefined as unknown as boolean });
    expect(await authorizeAdmin(request('Bearer x'), d)).toMatchObject({ ok: false, status: 403 });
  });
});
