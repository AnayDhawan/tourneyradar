import { redactEmails } from '@/lib/redact';

// Server-side PostHog person deletion, used when a player deletes their
// account. The browser SDK identifies a signed-in player by their Supabase
// auth user id (see lib/AuthContext.tsx), so that id is the PostHog distinct id.
//
// Needs a PostHog *personal* API key with person:write scope. The project token
// in NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN only ingests events and cannot delete.
//   POSTHOG_PERSONAL_API_KEY  personal API key
//   POSTHOG_PROJECT_ID        numeric project id from the PostHog URL
//   POSTHOG_API_HOST          optional, defaults to the EU cloud API host

const DEFAULT_API_HOST = 'https://eu.posthog.com';

export class PosthogDeletionError extends Error {
  constructor(message: string) {
    super(redactEmails(message));
    this.name = 'PosthogDeletionError';
  }
}

/**
 * Deletes the PostHog person for `distinctId`, together with their events.
 * Resolves when the person is gone or never existed. Throws
 * PosthogDeletionError on any other outcome, including missing configuration,
 * so a caller can never report a deletion that did not happen.
 */
export async function deletePosthogPerson(
  distinctId: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) {
    throw new PosthogDeletionError(
      'POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID must be set to delete analytics data'
    );
  }

  const host = (process.env.POSTHOG_API_HOST || DEFAULT_API_HOST).replace(/\/+$/, '');
  const base = `${host}/api/projects/${encodeURIComponent(projectId)}/persons`;
  const headers = { Authorization: `Bearer ${apiKey}` };

  const lookup = await fetchImpl(`${base}/?distinct_id=${encodeURIComponent(distinctId)}`, {
    headers,
  });
  if (!lookup.ok) {
    throw new PosthogDeletionError(`PostHog person lookup failed with status ${lookup.status}`);
  }

  const body = (await lookup.json()) as { results?: Array<{ id?: unknown }> };
  const personId = body.results?.[0]?.id;
  // No person means the player was never identified (or was already deleted).
  if (personId === undefined || personId === null) return;

  const removal = await fetchImpl(
    `${base}/${encodeURIComponent(String(personId))}/?delete_events=true`,
    { method: 'DELETE', headers }
  );
  // 404 means a concurrent request already removed the person.
  if (!removal.ok && removal.status !== 404) {
    throw new PosthogDeletionError(`PostHog person delete failed with status ${removal.status}`);
  }
}
