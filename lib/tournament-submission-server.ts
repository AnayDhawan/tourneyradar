import { randomUUID } from 'node:crypto';
import { submissionToRow, type ValidSubmission } from '@/lib/tournament-submission';
import { serviceRoleClient } from '@/lib/supabase-server';

// Writes go through the service role: `tournaments` has no client write policy
// and tournament_submissions has no policy at all. Every call is scoped to a
// player id the route took from the caller's verified token.

export interface SubmitCounts {
  today: number;
  pending: number;
}

/** How many this player sent in the last 24 hours, and how many still wait for review. */
export async function countSubmissions(playerId: string, now: Date = new Date()): Promise<SubmitCounts> {
  const client = serviceRoleClient();
  const since = new Date(now.getTime() - 86_400_000).toISOString();

  const [today, pending] = await Promise.all([
    client
      .from('tournament_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by', playerId)
      .gte('created_at', since),
    client
      .from('tournament_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by', playerId)
      .is('reviewed_at', null),
  ]);

  const error = today.error ?? pending.error;
  if (error) throw new Error(`Counting submissions failed: ${error.message}`);
  return { today: today.count ?? 0, pending: pending.count ?? 0 };
}

/** Inserts the pending tournament and the record of who sent it. Returns the new id. */
export async function createSubmission(playerId: string, submission: ValidSubmission): Promise<string> {
  const client = serviceRoleClient();
  const id = `submitted_${randomUUID()}`;

  const { error } = await client.from('tournaments').insert(submissionToRow(id, submission));
  if (error) throw new Error(`Saving submission failed: ${error.message}`);

  const { error: linkError } = await client
    .from('tournament_submissions')
    .insert({ tournament_id: id, submitted_by: playerId });
  if (linkError) {
    // A pending row with no owner would dodge the daily cap. Take it back out.
    // The original failure is the one worth reporting, so a failed clean-up is
    // folded into it rather than replacing it.
    const { error: cleanupError } = await client.from('tournaments').delete().eq('id', id);
    throw new Error(
      `Recording submission failed: ${linkError.message}` +
        (cleanupError ? ` (and could not remove the pending row: ${cleanupError.message})` : '')
    );
  }
  return id;
}
