import { geocodeSingleCity } from '@/lib/geocoding';
import {
  CLEARED_REVIEW,
  SUBMISSION_SOURCE,
  buildApprovalPatch,
  buildRejectionPatch,
  buildReviewRecord,
  noteFor,
  planTransition,
  resolveApprovalFields,
  type ModerationRequest,
  type StoredSubmission,
} from '@/lib/moderation';
import { serviceRoleClient } from '@/lib/supabase-server';

// Database side of the moderation dashboard (issue #263). Every call here uses
// the service role, so each is scoped by an id the route already validated and
// only runs after authorizeAdmin (lib/admin-server.ts) said yes.

const LIST_LIMIT = 200;

export interface PendingSubmission extends StoredSubmission {
  id: string;
  country: string;
  created_at: string | null;
  submitter: { name: string; email: string } | null;
}

interface TournamentRow extends StoredSubmission {
  id: string;
  country: string;
  status: string | null;
  source: string | null;
}

const TOURNAMENT_COLUMNS =
  'id, name, date, end_date, city, country, country_code, category, fide_rated, external_link, status, source';

/** Pending submissions, oldest first, with who sent them and when. */
export async function listPendingSubmissions(): Promise<PendingSubmission[]> {
  const client = serviceRoleClient();

  const { data: rows, error } = await client
    .from('tournaments')
    .select(TOURNAMENT_COLUMNS)
    .eq('source', SUBMISSION_SOURCE)
    .eq('status', 'pending')
    .order('date', { ascending: true })
    .limit(LIST_LIMIT)
    .returns<TournamentRow[]>();
  if (error) throw new Error(`Listing submissions failed: ${error.message}`);
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id);
  const { data: links, error: linkError } = await client
    .from('tournament_submissions')
    .select('tournament_id, submitted_by, created_at')
    .in('tournament_id', ids)
    .returns<{ tournament_id: string; submitted_by: string | null; created_at: string }[]>();
  if (linkError) throw new Error(`Listing submitters failed: ${linkError.message}`);

  const playerIds = [...new Set((links ?? []).map((l) => l.submitted_by).filter((v): v is string => !!v))];
  const players = new Map<string, { name: string; email: string }>();
  if (playerIds.length > 0) {
    const { data, error: playerError } = await client
      .from('players')
      .select('id, name, email')
      .in('id', playerIds)
      .returns<{ id: string; name: string; email: string }[]>();
    if (playerError) throw new Error(`Listing submitters failed: ${playerError.message}`);
    for (const p of data ?? []) players.set(p.id, { name: p.name, email: p.email });
  }

  const linkById = new Map((links ?? []).map((l) => [l.tournament_id, l]));
  return rows.map((r) => {
    const link = linkById.get(r.id);
    return {
      id: r.id,
      name: r.name,
      date: r.date,
      end_date: r.end_date,
      city: r.city,
      country: r.country,
      country_code: r.country_code,
      category: r.category,
      fide_rated: r.fide_rated,
      external_link: r.external_link,
      created_at: link?.created_at ?? null,
      submitter: link?.submitted_by ? (players.get(link.submitted_by) ?? null) : null,
    };
  });
}

export type DecisionResult =
  | { ok: true; id: string; status: 'published' | 'rejected' }
  | { ok: false; kind: 'not_found'; error: string }
  | { ok: false; kind: 'conflict'; error: string }
  | { ok: false; kind: 'invalid'; error: string; fields: Record<string, string> };

/**
 * Approves or rejects one pending submission and records who did it.
 *
 * The audit row is claimed first (only while reviewed_at is still null), then the
 * tournament is moved only while it is still pending. Two moderators acting on
 * the same row therefore cannot both win, and a published tournament never lacks
 * its audit record. If the tournament step fails the claim is released so the
 * submission can be reviewed again.
 */
export async function decideSubmission(
  id: string,
  request: ModerationRequest,
  adminAuthUserId: string,
  now: Date = new Date()
): Promise<DecisionResult> {
  const client = serviceRoleClient();

  const { data: row, error: readError } = await client
    .from('tournaments')
    .select(TOURNAMENT_COLUMNS)
    .eq('id', id)
    .maybeSingle<TournamentRow>();
  if (readError) throw new Error(`Reading submission failed: ${readError.message}`);
  if (!row) return { ok: false, kind: 'not_found', error: 'Submission not found' };

  const plan = planTransition(row, request.action);
  if (!plan.ok) {
    return plan.reason === 'not_a_submission'
      ? { ok: false, kind: 'not_found', error: 'Submission not found' }
      : { ok: false, kind: 'conflict', error: 'This submission has already been decided' };
  }

  let patch: Record<string, unknown>;
  if (request.action === 'approve') {
    const fields = resolveApprovalFields(row, request.edits, now);
    if (!fields.ok) {
      return { ok: false, kind: 'invalid', error: 'Check the listing before approving', fields: fields.errors };
    }
    const coordinates =
      request.coordinates ?? (await geocodeSingleCity(fields.value.city, fields.value.country));
    if (!coordinates) {
      return {
        ok: false,
        kind: 'invalid',
        error: `Could not place "${fields.value.city}, ${fields.value.country}". Enter latitude and longitude.`,
        fields: { lat: 'Enter coordinates' },
      };
    }
    patch = buildApprovalPatch(fields.value, coordinates, now);
  } else {
    patch = buildRejectionPatch();
  }

  const record = buildReviewRecord({
    decision: plan.decision,
    reviewedBy: adminAuthUserId,
    source: 'dashboard',
    note: noteFor(request),
    now,
  });

  const { data: claimed, error: claimError } = await client
    .from('tournament_submissions')
    .update(record)
    .eq('tournament_id', id)
    .is('reviewed_at', null)
    .select('id');
  if (claimError) throw new Error(`Recording review failed: ${claimError.message}`);
  if (!claimed?.length) {
    return { ok: false, kind: 'conflict', error: 'This submission has already been decided' };
  }

  const { data: moved, error: moveError } = await client
    .from('tournaments')
    .update(patch)
    .eq('id', id)
    .eq('source', SUBMISSION_SOURCE)
    .eq('status', 'pending')
    .select('id');

  if (moveError || !moved?.length) {
    const { error: releaseError } = await client
      .from('tournament_submissions')
      .update(CLEARED_REVIEW)
      .eq('tournament_id', id);
    if (moveError) {
      throw new Error(
        `Updating submission failed: ${moveError.message}` +
          (releaseError ? ` (and could not release the review record: ${releaseError.message})` : '')
      );
    }
    return { ok: false, kind: 'conflict', error: 'This submission has already been decided' };
  }

  return { ok: true, id, status: plan.next };
}
