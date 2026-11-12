import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deletePosthogPerson, PosthogDeletionError } from './posthog-server';

function response(status: number, body: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function run(fetchMock: ReturnType<typeof vi.fn>) {
  return deletePosthogPerson('user-1', fetchMock as unknown as typeof fetch);
}

beforeEach(() => {
  vi.stubEnv('POSTHOG_PERSONAL_API_KEY', 'phx_test');
  vi.stubEnv('POSTHOG_PROJECT_ID', '42');
  vi.stubEnv('POSTHOG_API_HOST', 'https://ph.example');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('deletePosthogPerson', () => {
  it('looks the person up by distinct id and deletes them with their events', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, { results: [{ id: 'person-uuid' }] }))
      .mockResolvedValueOnce(response(204));

    await run(fetchMock);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://ph.example/api/projects/42/persons/?distinct_id=user-1'
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://ph.example/api/projects/42/persons/person-uuid/?delete_events=true'
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE' });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer phx_test');
  });

  it('treats an unknown person as already deleted', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(200, { results: [] }));

    await expect(run(fetchMock)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the lookup fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(401));

    await expect(run(fetchMock)).rejects.toBeInstanceOf(PosthogDeletionError);
  });

  it('throws when the delete fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, { results: [{ id: 'person-uuid' }] }))
      .mockResolvedValueOnce(response(500));

    await expect(run(fetchMock)).rejects.toThrow(/status 500/);
  });

  it('throws instead of skipping when it is not configured', async () => {
    vi.stubEnv('POSTHOG_PERSONAL_API_KEY', '');
    const fetchMock = vi.fn();

    await expect(run(fetchMock)).rejects.toThrow(/must be set/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
