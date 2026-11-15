import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { confirmGuardianToken } = vi.hoisted(() => ({ confirmGuardianToken: vi.fn() }));
vi.mock('@/lib/guardian-consent-server', () => ({ confirmGuardianToken }));

import { POST } from './route';

function post(body: unknown) {
  return new NextRequest('http://localhost/api/guardian/confirm', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  confirmGuardianToken.mockReset();
});

describe('POST /api/guardian/confirm', () => {
  it('rejects a body that is not JSON, or has no token', async () => {
    expect((await POST(post('nope'))).status).toBe(400);
    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post({ token: 5 }))).status).toBe(400);
    expect((await POST(post({ token: 'x'.repeat(500) }))).status).toBe(400);
    expect(confirmGuardianToken).not.toHaveBeenCalled();
  });

  it('confirms a good token', async () => {
    confirmGuardianToken.mockResolvedValue('confirmed');
    const res = await POST(post({ token: 'abc' }));

    expect(res.status).toBe(200);
    expect(confirmGuardianToken).toHaveBeenCalledWith('abc');
    expect(await res.json()).toEqual({ status: 'confirmed' });
  });

  it('says 400 for an unknown token and 410 for an expired one', async () => {
    confirmGuardianToken.mockResolvedValueOnce('invalid').mockResolvedValueOnce('expired');

    expect((await POST(post({ token: 'abc' }))).status).toBe(400);
    expect((await POST(post({ token: 'abc' }))).status).toBe(410);
  });

  it('reports a database failure as 500 and does not leak its text', async () => {
    confirmGuardianToken.mockRejectedValue(new Error('relation player_age_checks does not exist'));
    const res = await POST(post({ token: 'abc' }));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('player_age_checks');
  });
});
