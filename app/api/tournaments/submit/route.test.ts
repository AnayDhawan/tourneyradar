import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAuthenticatedPlayer, countSubmissions, createSubmission } = vi.hoisted(() => ({
  getAuthenticatedPlayer: vi.fn(),
  countSubmissions: vi.fn(),
  createSubmission: vi.fn(),
}));
vi.mock('@/lib/supabase-server', () => ({ getAuthenticatedPlayer }));
vi.mock('@/lib/tournament-submission-server', () => ({ countSubmissions, createSubmission }));

import { POST } from './route';

function future(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

const valid = () => ({
  name: 'Pune Club Rapid',
  date: future(20),
  end_date: null,
  city: 'Pune',
  country_code: 'IN',
  category: 'Rapid',
  fide_rated: false,
  external_link: 'https://example.org/pune',
});

function post(body: unknown) {
  return new NextRequest('http://localhost/api/tournaments/submit', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  getAuthenticatedPlayer.mockResolvedValue({ playerId: 'p1', authUserId: 'u1', supabase: {} });
  countSubmissions.mockResolvedValue({ today: 0, pending: 0 });
  createSubmission.mockResolvedValue('submitted_x');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  getAuthenticatedPlayer.mockReset();
  countSubmissions.mockReset();
  createSubmission.mockReset();
});

describe('POST /api/tournaments/submit', () => {
  it('rejects a caller with no valid token', async () => {
    getAuthenticatedPlayer.mockResolvedValue(null);
    const res = await POST(post(valid()));

    expect(res.status).toBe(401);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('rejects a body that is not a JSON object', async () => {
    expect((await POST(post('nope'))).status).toBe(400);
    expect((await POST(post('[1]'))).status).toBe(400);
    expect((await POST(post('null'))).status).toBe(400);
  });

  it('rejects an oversized body', async () => {
    const res = await POST(post({ ...valid(), name: 'x'.repeat(10_000) }));
    expect(res.status).toBe(413);
  });

  it('returns the bad fields and saves nothing', async () => {
    const res = await POST(post({ ...valid(), name: '', external_link: 'javascript:alert(1)' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(Object.keys(body.fields).sort()).toEqual(['external_link', 'name']);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('saves a valid submission for the player from the token', async () => {
    const res = await POST(post({ ...valid(), player_id: 'someone-else' }));

    expect(res.status).toBe(201);
    expect(createSubmission).toHaveBeenCalledTimes(1);
    const [playerId, submission] = createSubmission.mock.calls[0];
    expect(playerId).toBe('p1');
    expect(submission.country).toBe('India');
    expect(submission).not.toHaveProperty('status');
  });

  it('answers a filled honeypot like a success and saves nothing', async () => {
    const res = await POST(post({ ...valid(), website: 'http://spam.example' }));

    expect(res.status).toBe(201);
    expect(createSubmission).not.toHaveBeenCalled();
    expect(countSubmissions).not.toHaveBeenCalled();
  });

  it('stops at the daily cap', async () => {
    countSubmissions.mockResolvedValue({ today: 3, pending: 3 });
    const res = await POST(post(valid()));

    expect(res.status).toBe(429);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('stops when too many submissions are still unreviewed', async () => {
    countSubmissions.mockResolvedValue({ today: 0, pending: 10 });
    const res = await POST(post(valid()));

    expect(res.status).toBe(429);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it('reports a database failure as 500 without its text', async () => {
    createSubmission.mockRejectedValue(new Error('relation tournament_submissions does not exist'));
    const res = await POST(post(valid()));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('tournament_submissions');
  });
});
