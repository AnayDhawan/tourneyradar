import type { TournamentListItem } from './tournaments';

/**
 * Personalized tournament ranking (issue #127).
 *
 * WHAT THIS IS: a v1 rule-based / weighted multi-signal scoring function.
 * WHAT THIS IS NOT: a trained or learned model, and not collaborative
 * filtering. Those terms mean something specific (parameters fit by gradient
 * descent, or similarity computed across many users' real interaction
 * histories) and neither is honest here. This repo has no labeled
 * interaction data, no offline training pipeline, and no ML infra, so there
 * is nothing to train a model on yet. What follows is a transparent, hand
 * -weighted scoring function over the signals that actually exist: a
 * player's stated preferences (home country, category interest, FIDE-rated
 * preference, self-reported rating) plus one implicit-interest signal
 * (wishlist category/country overlap). It ranks rather than filters, which
 * is a real, legitimate step up from the plain `.eq()`/`.gte()` WHERE-clause
 * filtering in `queryTournaments()`/`getUpcomingTournaments()`, and it is
 * also the normal, honest precursor to a learned model, not a substitute
 * for one dressed up as "ML".
 *
 * WHAT WOULD JUSTIFY A REAL LEARNED MODEL LATER: enough labeled implicit- or
 * explicit-interest events at volume, tied to (player_id, tournament_id,
 * timestamp) — wishlist-add events, tournament detail page views /
 * click-throughs, or (strongest signal) registration-link click-throughs or
 * conversions — collected over weeks to months across enough players to
 * generalize. At that point the weighted signals below become a reasonable
 * starting feature set for a real ranking model (or a collaborative-
 * filtering / bandit approach over player-tournament interactions), and the
 * hand-picked weight constants below become learned parameters instead.
 * Until that data exists, this file is the honest v1.
 */

/**
 * Named, documented weight constants. These are hand-picked, not learned or
 * fit against any data, and are intentionally not normalized to sum to 100:
 * the score is only ever used for relative ordering (sort descending), never
 * displayed or compared across players.
 *
 * Relative sizing rationale:
 * - CATEGORY_PREFERENCE_MATCH is the single highest weight. Time control
 *   format (Classical/Rapid/Blitz) is the most explicit, most load-bearing
 *   preference a player states, and it is close to a hard requirement in
 *   practice (a Blitz player rarely wants Classical results).
 * - HOME_COUNTRY_MATCH is second. Travel logistics dominate whether a
 *   tournament is actually attendable, so it is nearly as strong a signal
 *   as category, but a foreign tournament isn't disqualifying the way a
 *   mismatched category effectively is.
 * - FIDE_RATED_PREFERENCE_MATCH and RATING_BAND_FIT are explicit but
 *   narrower preferences (they only ever apply to a subset of tournaments
 *   that set the relevant fields), so they get a moderate weight each.
 * - The two WISHLIST_* weights are implicit signals inferred from behavior
 *   rather than stated directly, so each is weighted below its explicit
 *   counterpart (category below CATEGORY_PREFERENCE_MATCH, country below
 *   HOME_COUNTRY_MATCH) while still counting for something: a player who
 *   keeps wishlisting Rapid tournaments abroad is telling us something even
 *   if they never opened settings to say so.
 */
export const RANKING_WEIGHTS = {
  HOME_COUNTRY_MATCH: 30,
  CATEGORY_PREFERENCE_MATCH: 35,
  FIDE_RATED_PREFERENCE_MATCH: 15,
  RATING_BAND_FIT: 10,
  WISHLIST_CATEGORY_OVERLAP: 12,
  WISHLIST_COUNTRY_OVERLAP: 8,
} as const;

/**
 * The subset of a player's row that ranking actually uses. Deliberately not
 * the full `players` table shape (see `lib/AuthContext.tsx`'s `Player`
 * type for that) so this module stays decoupled from onboarding/referral
 * fields it has no business touching.
 *
 * Note: the issue text says "rating prefs", but there is no rating-band
 * preference field on `players`, only the boolean `min_fide_rated` and the
 * player's own self-reported `rating`. This uses what actually exists
 * (`rating` matched against a tournament's own `min_rating`/`max_rating`)
 * rather than inventing new schema for a v1 scoring pass.
 */
export interface PlayerRankingPreferences {
  home_country_code?: string | null;
  notify_categories?: string[] | null;
  min_fide_rated?: boolean | null;
  rating?: number | null;
}

/**
 * Scores one tournament for one player by summing weighted signal matches.
 * Pure and side-effect-free: no network calls, no randomness, so it is
 * directly unit-testable with plain fixture objects.
 *
 * @param tournament candidate tournament being scored
 * @param player the player's stored preferences (a subset of their `players` row)
 * @param wishlist the player's currently wishlisted tournaments, used as an
 *   implicit-interest signal (category/country overlap). Pass `[]` if the
 *   player has no wishlist yet or it hasn't loaded.
 */
export function scoreTournamentForPlayer(
  tournament: TournamentListItem,
  player: PlayerRankingPreferences,
  wishlist: TournamentListItem[]
): number {
  let score = 0;

  // Explicit signal: home country match.
  if (
    player.home_country_code &&
    tournament.country_code &&
    player.home_country_code.toUpperCase() === tournament.country_code.toUpperCase()
  ) {
    score += RANKING_WEIGHTS.HOME_COUNTRY_MATCH;
  }

  // Explicit signal: category is one the player opted into notifications for.
  if (
    tournament.category &&
    player.notify_categories?.length &&
    player.notify_categories.includes(tournament.category)
  ) {
    score += RANKING_WEIGHTS.CATEGORY_PREFERENCE_MATCH;
  }

  // Explicit signal: player wants FIDE-rated tournaments only, and this one
  // qualifies. Deliberately not a penalty when the tournament isn't
  // FIDE-rated, this is a ranker boosting good fits, not a filter excluding
  // bad ones.
  if (player.min_fide_rated && tournament.fide_rated) {
    score += RANKING_WEIGHTS.FIDE_RATED_PREFERENCE_MATCH;
  }

  // Explicit signal: player's self-reported rating falls inside the
  // tournament's rating band, when the tournament defines one. Skipped
  // entirely when the tournament sets neither bound, since "fits an
  // unbounded band" is true of every tournament and would add no signal.
  if (
    typeof player.rating === 'number' &&
    (tournament.min_rating != null || tournament.max_rating != null)
  ) {
    const meetsMin = tournament.min_rating == null || player.rating >= tournament.min_rating;
    const meetsMax = tournament.max_rating == null || player.rating <= tournament.max_rating;
    if (meetsMin && meetsMax) {
      score += RANKING_WEIGHTS.RATING_BAND_FIT;
    }
  }

  // Implicit signal: category overlap with the player's own wishlist.
  if (tournament.category && wishlist.length > 0) {
    const wishlistedCategories = new Set(
      wishlist.map((w) => w.category).filter((c): c is string => Boolean(c))
    );
    if (wishlistedCategories.has(tournament.category)) {
      score += RANKING_WEIGHTS.WISHLIST_CATEGORY_OVERLAP;
    }
  }

  // Implicit signal: country overlap with the player's own wishlist.
  if (tournament.country_code && wishlist.length > 0) {
    const wishlistedCountries = new Set(
      wishlist
        .map((w) => w.country_code?.toUpperCase())
        .filter((c): c is string => Boolean(c))
    );
    if (wishlistedCountries.has(tournament.country_code.toUpperCase())) {
      score += RANKING_WEIGHTS.WISHLIST_COUNTRY_OVERLAP;
    }
  }

  return score;
}
