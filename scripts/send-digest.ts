// Weekly tournament-match digest email job (#119).
//
// Runs after the weekly scrape's `merge` job finishes pushing new rows to
// Supabase (see .github/workflows/scrape.yml). For every player with
// notify_frequency = 'weekly', diffs newly-scraped tournaments against their
// saved home_country_code / notify_categories / min_fide_rated preferences,
// batches all matches for that player into one email, and sends it via
// lib/email.ts.
//
// "Newly inserted" detection: this uses `tournaments.scraped_at >= now() -
// DIGEST_WINDOW`, not the `tournament_history` table (from #125). scraped_at
// is set on every push in scripts/scrape.ts's pushTournaments(), so it is
// already exactly the "touched by this run" marker this job needs, with no
// extra join or snapshot-diffing required. tournament_history is an
// append-old-state-on-change audit log (old values in `snapshot`, keyed by
// `recorded_at`), it answers "what changed" for a given row, not "which rows
// are new this run" — using it here would mean reconstructing the same
// per-run boundary that scraped_at already gives for free. Simpler and
// robust wins per repo convention.
//
// unsubscribe_token: referenced below on the `players` row and passed to
// lib/email.ts's unsubscribe link, but the column does not exist in this
// worktree. It is being added by the separate #120 branch (notification
// settings + unsubscribe page). This script only works end-to-end once that
// migration has landed; until then the select below will 42703 (column does
// not exist) against a live database. Left as fail-loud rather than
// papered over, so the missing dependency is obvious instead of silently
// sending broken unsubscribe links.

import { createClient } from '@supabase/supabase-js';
import { sendDigestEmail } from '../lib/email';
import type { Tournament } from '../lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tourneyradar.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables.');
  console.error('  Run with: npm run digest');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// How far back a tournament's scraped_at may be to still count as "new this
// run". The scrape cron fires weekly (0 2 * * 0); 8 days gives one day of
// slack for a delayed or retried run without pulling in a whole extra cycle.
const DIGEST_WINDOW_DAYS = 8;

const TOURNAMENT_SELECT_FIELDS = `
  id,
  name,
  date,
  end_date,
  city,
  state,
  country,
  country_code,
  category,
  fide_rated,
  min_rating,
  max_rating,
  lat,
  lng,
  source_url,
  external_link,
  location,
  status,
  scraped_at
`;

interface DigestPlayer {
  id: string;
  email: string;
  home_country_code: string | null;
  notify_categories: string[] | null;
  min_fide_rated: boolean | null;
  // Lands via #120's migration; not present in this worktree's schema yet.
  // Left untyped-through rather than widening a shared Player type that
  // doesn't otherwise exist in this repo.
  unsubscribe_token?: string | null;
}

async function logDigestRun(sent: number, tournamentCount: number, considered: number): Promise<void> {
  try {
    await supabase.from('scraper_logs').insert({
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'success',
      message: `[digest] sent ${sent} emails covering ${tournamentCount} tournaments (${considered} weekly subscribers considered)`,
    });
  } catch {
    // Logging must never crash the job itself.
  }
}

async function logDigestFailure(reason: string): Promise<void> {
  try {
    await supabase.from('scraper_logs').insert({
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'failed',
      message: `[digest] ${reason}`,
    });
  } catch {
    // Logging must never crash the job itself.
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function matchingTournaments(
  player: DigestPlayer,
  cutoffIso: string
): Promise<Tournament[]> {
  // Nothing to match against yet; skip rather than emailing everything or
  // nothing at random.
  if (!player.home_country_code || !player.notify_categories?.length) {
    return [];
  }

  let query = supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT_FIELDS)
    .eq('status', 'published')
    .eq('country_code', player.home_country_code)
    .in('category', player.notify_categories)
    .gte('scraped_at', cutoffIso)
    .order('date', { ascending: true });

  if (player.min_fide_rated) {
    query = query.eq('fide_rated', true);
  }

  const { data, error } = await query;
  if (error) {
    await logScraperFailureForPlayer(player.id, error.message);
    return [];
  }
  return (data || []) as unknown as Tournament[];
}

async function logScraperFailureForPlayer(playerId: string, reason: string): Promise<void> {
  try {
    await supabase.from('scraper_logs').insert({
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'failed',
      message: `[digest:player:${playerId}] ${reason}`,
    });
  } catch {
    // Logging must never crash the job itself.
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  TourneyRadar Weekly Digest');
  console.log('='.repeat(60) + '\n');

  const cutoff = new Date(Date.now() - DIGEST_WINDOW_DAYS * 86_400_000).toISOString();
  console.log(`  Digest window: tournaments scraped since ${cutoff}\n`);

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, email, home_country_code, notify_categories, min_fide_rated, unsubscribe_token')
    .eq('notify_frequency', 'weekly');

  if (playersError) {
    console.error('Failed to load weekly-digest players:', playersError.message);
    await logDigestFailure(`failed to load players: ${playersError.message}`);
    process.exit(1);
  }

  const weeklyPlayers = (players || []) as DigestPlayer[];
  console.log(`  ${weeklyPlayers.length} player(s) subscribed to the weekly digest\n`);

  let emailsSent = 0;
  let tournamentsCovered = 0;

  for (const player of weeklyPlayers) {
    if (!player.email) continue;

    try {
      const tournaments = await matchingTournaments(player, cutoff);
      if (tournaments.length === 0) continue;

      const unsubscribeUrl = `${SITE_URL}/player/unsubscribe/${player.unsubscribe_token ?? ''}`;
      await sendDigestEmail(player.email, tournaments, unsubscribeUrl);

      emailsSent++;
      tournamentsCovered += tournaments.length;
      console.log(`  sent ${player.email}: ${tournaments.length} tournament(s)`);
    } catch (err) {
      console.error(`  failed for ${player.email}:`, errorMessage(err));
      await logScraperFailureForPlayer(player.id, errorMessage(err));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  DONE: ${emailsSent} email(s) sent, ${tournamentsCovered} tournament(s) covered`);
  console.log('='.repeat(60) + '\n');

  await logDigestRun(emailsSent, tournamentsCovered, weeklyPlayers.length);
}

main().catch(async (err) => {
  console.error(err);
  await logDigestFailure(`main: ${errorMessage(err)}`);
  process.exit(1);
});
