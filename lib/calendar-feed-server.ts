import { serviceRoleClient } from '@/lib/supabase-server';
import { feedTokensMatch, generateFeedToken, isValidFeedToken } from '@/lib/calendar-feed';
import type { IcsTournament } from '@/lib/ics-feed';

// Database access for the private wishlist calendar feed. Everything here runs
// through the service-role client, because player_calendar_feeds is service role
// only (see 20261126120000_player_calendar_feeds.sql). That client bypasses RLS,
// so every query is scoped by hand: to a player id the caller already resolved
// from a verified access token, or to the one row matching the feed token.
//
// Errors are thrown as plain Errors carrying the Postgres code only. Nothing here
// puts a token in a message, so a caller can log the error without leaking one.

const MAX_WISHLIST_IDS = 300;
const MAX_FEED_TOURNAMENTS = 300;
const UNIQUE_VIOLATION = '23505';

function fail(step: string, code: string | undefined): never {
  throw new Error(`calendar feed ${step} failed${code ? ` (${code})` : ''}`);
}

/** The player's current feed token, or null if they have not enabled the feed. */
export async function getFeedToken(playerId: string): Promise<string | null> {
  const { data, error } = await serviceRoleClient()
    .from('player_calendar_feeds')
    .select('token')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) fail('read', error.code);
  return data?.token ?? null;
}

/**
 * Returns the player's token, creating one if none exists. Idempotent and safe
 * against two tabs racing: the insert is ignored on conflict and the winner's
 * token is read back.
 */
export async function ensureFeedToken(playerId: string): Promise<string> {
  const admin = serviceRoleClient();
  const { error } = await admin
    .from('player_calendar_feeds')
    .upsert({ player_id: playerId, token: generateFeedToken() }, {
      onConflict: 'player_id',
      ignoreDuplicates: true,
    });
  if (error) fail('create', error.code);

  const token = await getFeedToken(playerId);
  if (!token) fail('create', undefined);
  return token;
}

/**
 * Replaces the player's token. The old one stops resolving the moment this
 * commits, because there is one row per player and it is updated in place.
 */
export async function rotateFeedToken(playerId: string): Promise<string> {
  const admin = serviceRoleClient();
  const token = generateFeedToken();
  const rotatedAt = new Date().toISOString();

  const updated = await admin
    .from('player_calendar_feeds')
    .update({ token, rotated_at: rotatedAt })
    .eq('player_id', playerId)
    .select('player_id');
  if (updated.error) fail('rotate', updated.error.code);
  if (updated.data && updated.data.length > 0) return token;

  // No row yet: regenerating before ever enabling just enables it.
  const inserted = await admin
    .from('player_calendar_feeds')
    .insert({ player_id: playerId, token });
  if (inserted.error) {
    // A concurrent enable won the insert; rotate over it.
    if (inserted.error.code === UNIQUE_VIOLATION) return rotateFeedToken(playerId);
    fail('rotate', inserted.error.code);
  }
  return token;
}

/**
 * Resolves a feed token to its player, or null. The token is shape-checked
 * first, looked up by exact match on the unique index, then compared again in
 * constant time so a match is never decided by a database string comparison
 * alone.
 */
export async function findPlayerIdByFeedToken(token: string): Promise<string | null> {
  if (!isValidFeedToken(token)) return null;

  const { data, error } = await serviceRoleClient()
    .from('player_calendar_feeds')
    .select('player_id, token')
    .eq('token', token)
    .maybeSingle();
  if (error) fail('lookup', error.code);
  if (!data || !feedTokensMatch(data.token, token)) return null;
  return data.player_id;
}

/**
 * The player's saved tournaments that are published and not yet over. Unpublished
 * rows (pending, duplicate, invalid_date) are never returned, even when saved.
 */
export async function listFeedTournaments(playerId: string, today: string): Promise<IcsTournament[]> {
  const admin = serviceRoleClient();

  const saved = await admin
    .from('player_favorite_tournaments')
    .select('tournament_id')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(MAX_WISHLIST_IDS);
  if (saved.error) fail('wishlist read', saved.error.code);

  const ids = (saved.data ?? []).map((row) => row.tournament_id);
  if (ids.length === 0) return [];

  // Still running counts as upcoming: keep a multi-day event until its last day.
  const { data, error } = await admin
    .from('tournaments')
    .select('id, name, date, end_date, city, state, country')
    .in('id', ids)
    .eq('status', 'published')
    .or(`date.gte.${today},end_date.gte.${today}`)
    .order('date', { ascending: true })
    .limit(MAX_FEED_TOURNAMENTS);
  if (error) fail('tournaments read', error.code);

  return data ?? [];
}
