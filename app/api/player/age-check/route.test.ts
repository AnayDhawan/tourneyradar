import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgeCheckRow } from '@/lib/guardian-consent';

const { getAuthenticatedPlayer, getAgeCheck, recordAgeBasis, issueGuardianToken, sendGuardianConsentEmail } =
  vi.hoisted(() => ({
    getAuthenticatedPlayer: vi.fn(),
    getAgeCheck: vi.fn(),
    recordAgeBasis: vi.fn(),
    issueGuardianToken: vi.fn(),
    sendGuardianConsentEmail: vi.fn(),
  }));
vi.mock('@/lib/supabase-server', () => ({ getAuthenticatedPlayer }));
vi.mock('@/lib/guardian-consent-server', () => ({ getAgeCheck, recordAgeBasis, issueGuardianToken }));
vi.mock('@/lib/email', () => ({ sendGuardianConsentEmail }));

import { GET, POST } from './route';

function profileClient(profile: { name: string; email: string } | null) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: profile, error: null }),
  };
  return { from: () => builder };
}

function post(body: unknown) {
  return new NextRequest('http://localhost/api/player/age-check', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function row(overrides: Partial<AgeCheckRow> = {}): AgeCheckRow {
  return {
    age_basis: 'parental_consent',
    guardian_email: 'parent@example.com',
    guardian_token_hash: null,
    guardian_requested_at: null,
    guardian_expires_at: null,
    guardian_send_count: 0,
    guardian_confirmed_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  getAuthenticatedPlayer.mockResolvedValue({
    playerId: 'p1',
    authUserId: 'u1',
    supabase: profileClient({ name: 'Kid', email: 'kid@example.com' }),
  });
  getAgeCheck.mockResolvedValue(null);
  recordAgeBasis.mockResolvedValue(undefined);
  issueGuardianToken.mockResolvedValue('tok123');
  sendGuardianConsentEmail.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const fn of [getAuthenticatedPlayer, getAgeCheck, recordAgeBasis, issueGuardianToken, sendGuardianConsentEmail]) {
    fn.mockReset();
  }
});

describe('GET /api/player/age-check', () => {
  it('rejects a caller with no valid token', async () => {
    getAuthenticatedPlayer.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/player/age-check'));
    expect(res.status).toBe(401);
  });

  it('reports unknown for an account with no answer', async () => {
    const res = await GET(new NextRequest('http://localhost/api/player/age-check'));
    expect(await res.json()).toEqual({ status: 'unknown', guardianEmail: null, confirmedAt: null });
  });

  it('masks the guardian email', async () => {
    getAgeCheck.mockResolvedValue(row());
    const res = await GET(new NextRequest('http://localhost/api/player/age-check'));
    expect((await res.json()).guardianEmail).toBe('p***@example.com');
  });
});

describe('POST /api/player/age-check', () => {
  it('rejects a caller with no valid token', async () => {
    getAuthenticatedPlayer.mockResolvedValue(null);
    expect((await POST(post({ age_basis: '16_or_older' }))).status).toBe(401);
    expect(recordAgeBasis).not.toHaveBeenCalled();
  });

  it('rejects bad bodies', async () => {
    expect((await POST(post('not json'))).status).toBe(400);
    expect((await POST(post({ age_basis: 'adult' }))).status).toBe(400);
  });

  it('stores "16 or older" for an account with no answer, and sends no email', async () => {
    getAgeCheck
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(row({ age_basis: '16_or_older', guardian_email: null }));
    const res = await POST(post({ age_basis: '16_or_older' }));

    expect(res.status).toBe(200);
    expect(recordAgeBasis).toHaveBeenCalledWith('p1', '16_or_older', null);
    expect((await res.json()).status).toBe('adult');
    expect(sendGuardianConsentEmail).not.toHaveBeenCalled();
  });

  it('refuses to move an under-16 account to "16 or older"', async () => {
    getAgeCheck.mockResolvedValue(row());
    const res = await POST(post({ age_basis: '16_or_older' }));

    expect(res.status).toBe(409);
    expect(recordAgeBasis).not.toHaveBeenCalled();
  });

  it('requires a valid guardian email for under-16', async () => {
    expect((await POST(post({ age_basis: 'parental_consent' }))).status).toBe(400);
    expect((await POST(post({ age_basis: 'parental_consent', guardian_email: 'nope' }))).status).toBe(400);
    expect(sendGuardianConsentEmail).not.toHaveBeenCalled();
  });

  it('refuses the child\'s own address as the guardian', async () => {
    const res = await POST(post({ age_basis: 'parental_consent', guardian_email: 'Kid@Example.com' }));

    expect(res.status).toBe(400);
    expect(sendGuardianConsentEmail).not.toHaveBeenCalled();
  });

  it('records the answer, issues a link and emails the guardian', async () => {
    getAgeCheck.mockResolvedValueOnce(null).mockResolvedValueOnce(row()).mockResolvedValueOnce(
      row({ guardian_token_hash: 'h', guardian_expires_at: '2999-01-01T00:00:00Z', guardian_send_count: 1 })
    );
    const res = await POST(post({ age_basis: 'parental_consent', guardian_email: ' Parent@Example.com ' }));

    expect(res.status).toBe(200);
    expect(recordAgeBasis).toHaveBeenCalledWith('p1', 'parental_consent', 'parent@example.com');
    expect(issueGuardianToken).toHaveBeenCalledWith('p1', 'parent@example.com', 0);
    expect(sendGuardianConsentEmail).toHaveBeenCalledTimes(1);
    const [to, name, url] = sendGuardianConsentEmail.mock.calls[0];
    expect(to).toBe('parent@example.com');
    expect(name).toBe('Kid');
    expect(url).toContain('/guardian/confirm?token=tok123');
    expect((await res.json()).status).toBe('guardian_pending');
  });

  it('resends to the address on file when none is given', async () => {
    getAgeCheck.mockResolvedValue(row({ guardian_send_count: 1 }));
    const res = await POST(post({ age_basis: 'parental_consent' }));

    expect(res.status).toBe(200);
    expect(recordAgeBasis).not.toHaveBeenCalled();
    expect(issueGuardianToken).toHaveBeenCalledWith('p1', 'parent@example.com', 1);
  });

  it('enforces the resend cooldown', async () => {
    getAgeCheck.mockResolvedValue(row({ guardian_requested_at: new Date().toISOString(), guardian_send_count: 1 }));
    const res = await POST(post({ age_basis: 'parental_consent' }));

    expect(res.status).toBe(429);
    expect(issueGuardianToken).not.toHaveBeenCalled();
    expect(sendGuardianConsentEmail).not.toHaveBeenCalled();
  });

  it('stops after the send cap', async () => {
    getAgeCheck.mockResolvedValue(row({ guardian_send_count: 5 }));
    const res = await POST(post({ age_basis: 'parental_consent' }));

    expect(res.status).toBe(429);
    expect(sendGuardianConsentEmail).not.toHaveBeenCalled();
  });

  it('does nothing more once the guardian has confirmed', async () => {
    getAgeCheck.mockResolvedValue(row({ guardian_confirmed_at: '2026-11-10T00:00:00Z' }));
    const res = await POST(post({ age_basis: 'parental_consent', guardian_email: 'other@example.com' }));

    expect((await res.json()).status).toBe('guardian_confirmed');
    expect(issueGuardianToken).not.toHaveBeenCalled();
    expect(sendGuardianConsentEmail).not.toHaveBeenCalled();
  });

  it('reports an email failure instead of pretending a link was sent, without leaking the address', async () => {
    getAgeCheck.mockResolvedValue(row());
    sendGuardianConsentEmail.mockRejectedValue(new Error('Resend said no to parent@example.com'));
    const res = await POST(post({ age_basis: 'parental_consent' }));

    expect(res.status).toBe(502);
    const logged = JSON.stringify((console.error as unknown as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).not.toContain('parent@example.com');
    expect(JSON.stringify(await res.json())).not.toContain('parent@example.com');
  });
});
