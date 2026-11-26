import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { authorizeAdmin, decideSubmission } = vi.hoisted(() => ({
  authorizeAdmin: vi.fn(),
  decideSubmission: vi.fn(),
}));
vi.mock('@/lib/admin-server', () => ({ authorizeAdmin }));
vi.mock('@/lib/moderation-server', () => ({ decideSubmission }));

import { POST } from './route';

const ID = 'submitted_123e4567-e89b-12d3-a456-426614174000';

function post(body: unknown, id: string = ID) {
  const request = new NextRequest(`http://localhost/api/admin/submissions/${id}`, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  authorizeAdmin.mockResolvedValue({ ok: true, authUserId: 'admin-1' });
  decideSubmission.mockResolvedValue({ ok: true, id: ID, status: 'published' });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  authorizeAdmin.mockReset();
  decideSubmission.mockReset();
});

describe('POST /api/admin/submissions/[id] auth gate', () => {
  it('answers 401 to an unauthenticated caller and changes nothing', async () => {
    authorizeAdmin.mockResolvedValue({ ok: false, status: 401, error: 'Authentication required' });
    const res = await post({ action: 'approve' });

    expect(res.status).toBe(401);
    expect(decideSubmission).not.toHaveBeenCalled();
  });

  it('answers 403 to a signed-in non-admin and changes nothing', async () => {
    authorizeAdmin.mockResolvedValue({ ok: false, status: 403, error: 'Admin access required' });
    for (const body of [{ action: 'approve' }, { action: 'reject', reason: 'x' }]) {
      const res = await post(body);
      expect(res.status).toBe(403);
    }
    expect(decideSubmission).not.toHaveBeenCalled();
  });

  it('does not reveal whether an id exists before the gate passes', async () => {
    authorizeAdmin.mockResolvedValue({ ok: false, status: 403, error: 'Admin access required' });
    expect((await post({ action: 'approve' }, 'nope')).status).toBe(403);
  });
});

describe('POST /api/admin/submissions/[id] transitions', () => {
  it('approves for an admin, taking the reviewer from the verified token', async () => {
    const res = await post({ action: 'approve', note: 'ok', reviewed_by: 'someone-else' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: ID, status: 'published' });
    const [id, request, reviewer] = decideSubmission.mock.calls[0];
    expect(id).toBe(ID);
    expect(request).toMatchObject({ action: 'approve', note: 'ok' });
    expect(reviewer).toBe('admin-1');
  });

  it('rejects with a reason', async () => {
    decideSubmission.mockResolvedValue({ ok: true, id: ID, status: 'rejected' });
    const res = await post({ action: 'reject', reason: 'Duplicate' });

    expect(res.status).toBe(200);
    expect(decideSubmission.mock.calls[0][1]).toEqual({ action: 'reject', reason: 'Duplicate' });
  });

  it('refuses a rejection without a reason', async () => {
    const res = await post({ action: 'reject' });

    expect(res.status).toBe(400);
    expect(decideSubmission).not.toHaveBeenCalled();
  });

  it('answers 409 when the submission was already decided', async () => {
    decideSubmission.mockResolvedValue({ ok: false, kind: 'conflict', error: 'This submission has already been decided' });
    expect((await post({ action: 'approve' })).status).toBe(409);
  });

  it('answers 404 for a missing submission and for a malformed id', async () => {
    decideSubmission.mockResolvedValue({ ok: false, kind: 'not_found', error: 'Submission not found' });
    expect((await post({ action: 'approve' })).status).toBe(404);

    decideSubmission.mockClear();
    expect((await post({ action: 'approve' }, "x' or 1=1")).status).toBe(404);
    expect(decideSubmission).not.toHaveBeenCalled();
  });

  it('answers 422 with the bad fields when the edit does not validate', async () => {
    decideSubmission.mockResolvedValue({
      ok: false,
      kind: 'invalid',
      error: 'Check the listing before approving',
      fields: { name: 'Enter the tournament name (3 to 120 characters)' },
    });
    const res = await post({ action: 'approve', edits: { name: '' } });

    expect(res.status).toBe(422);
    expect((await res.json()).fields).toHaveProperty('name');
  });

  it('rejects bad JSON and oversized bodies', async () => {
    expect((await post('nope')).status).toBe(400);
    expect((await post({ action: 'approve', note: 'x'.repeat(10_000) })).status).toBe(413);
    expect(decideSubmission).not.toHaveBeenCalled();
  });

  it('reports a database failure as 500 without its text', async () => {
    decideSubmission.mockRejectedValue(new Error('column reviewed_by does not exist'));
    const res = await post({ action: 'approve' });

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('reviewed_by');
  });
});
