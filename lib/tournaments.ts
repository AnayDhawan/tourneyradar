import { supabase } from './supabase';
import { scoreTournamentForPlayer, type PlayerRankingPreferences } from './ranking';

// Listings hide tournaments starting within the next `days` days: players need
// lead time to register and travel, so anything too imminent is noise. Returns
// the lower-bound date (YYYY-MM-DD) a tournament's `date` must be >= to. Rolling
// window — the daily scrape cron makes this self-refresh.
function leadTimeCutoff(days = 7): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().split('T')[0];
}

export interface TournamentListItem {
  id: string;
  name: string;
  date: string;
  end_date?: string;
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  category?: string;
  fide_rated?: boolean;
  min_rating?: number | null;
  max_rating?: number | null;
  lat?: number;
  lng?: number;
  source_url?: string;
  external_link?: string;
  location?: string;
  created_at?: string;
}

export interface TournamentStats {
  total: number;
  countries: number;
  mapped: number;
}

export interface PaginatedTournaments {
  tournaments: TournamentListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

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
  created_at
`;

export async function getUpcomingTournaments(
  page = 1,
  limit = 50,
  options?: {
    country?: string;
    category?: string;
  }
): Promise<PaginatedTournaments> {
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  const cutoff = leadTimeCutoff();

  let query = supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT_FIELDS, { count: 'exact' })
    .gte('date', cutoff)
    .eq('status', 'published')
    .order('date', { ascending: true })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (options?.country) {
    query = query.eq('country_code', options.country.toUpperCase());
  }

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching tournaments:', error);
    return {
      tournaments: [],
      total: 0,
      page,
      limit,
      hasMore: false
    };
  }

  return {
    tournaments: data || [],
    total: count || 0,
    page,
    limit,
    hasMore: (count || 0) > end + 1
  };
}

export async function getTournamentStats(): Promise<TournamentStats> {
  const cutoff = leadTimeCutoff();

  const [totalResult, countriesResult, mappedResult] = await Promise.all([
    supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .gte('date', cutoff)
      .eq('status', 'published'),
    
    supabase
      .from('tournaments')
      .select('country_code')
      .gte('date', cutoff)
      .eq('status', 'published'),
    
    supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .gte('date', cutoff)
      .eq('status', 'published')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
  ]);

  const uniqueCountries = new Set(
    countriesResult.data?.map(c => c.country_code).filter(Boolean)
  );

  return {
    total: totalResult.count || 0,
    countries: uniqueCountries.size,
    mapped: mappedResult.count || 0
  };
}

export async function getAllUpcomingTournaments(
  limit = 1000
): Promise<TournamentListItem[]> {
  const cutoff = leadTimeCutoff();

  const { data, error } = await supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT_FIELDS)
    .gte('date', cutoff)
    .eq('status', 'published')
    .order('date', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching all tournaments:', error);
    return [];
  }

  return data || [];
}

// Supabase caps a single response, and the dataset has outgrown any one page,
// so a bare .limit(n) silently truncates. Walks fixed-size pages instead and
// stops on a short page, so every marker reaches the map without ever holding
// an unbounded single query open. Callers are expected to cache the result.
const MAP_PAGE_SIZE = 1000;
const MAP_MAX_PAGES = 20;

export async function getMapTournaments(
  fields: string = TOURNAMENT_SELECT_FIELDS
): Promise<TournamentListItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const all: TournamentListItem[] = [];

  for (let page = 0; page < MAP_MAX_PAGES; page++) {
    const start = page * MAP_PAGE_SIZE;

    const { data, error } = await supabase
      .from('tournaments')
      .select(fields)
      .gte('date', today)
      .eq('status', 'published')
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(start, start + MAP_PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching map tournaments:', error);
      break;
    }

    const rows = (data || []) as unknown as TournamentListItem[];
    all.push(...rows);

    if (rows.length < MAP_PAGE_SIZE) return all;
  }

  console.warn(
    `getMapTournaments hit the ${MAP_MAX_PAGES}-page ceiling; results may be truncated`
  );
  return all;
}

const TOURNAMENT_MAX_LIMIT = 200;
const TOURNAMENT_DEFAULT_LIMIT = 100;

export interface TournamentQuery {
  page?: number;
  limit?: number;
  country?: string | null;
  q?: string | null;
}

export interface TournamentPage {
  tournaments: TournamentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// Shared, validated query used by both the /api/tournaments endpoint and the
// tournaments page. Clamps `limit` to a safe range, derives `page` from a
// 1-based index, supports optional country filtering and free-text search, and
// returns the total count so callers can render real pagination.
export async function queryTournaments({
  page = 1,
  limit = TOURNAMENT_DEFAULT_LIMIT,
  country,
  q,
}: TournamentQuery = {}): Promise<TournamentPage> {
  const safeLimit =
    Number.isInteger(limit) && limit > 0
      ? Math.min(limit, TOURNAMENT_MAX_LIMIT)
      : TOURNAMENT_DEFAULT_LIMIT;
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit - 1;
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT_FIELDS, { count: 'exact' })
    .eq('status', 'published')
    .gte('date', today)
    .order('date', { ascending: true })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (country) {
    query = query.eq('country_code', country.toUpperCase());
  }

  if (q && q.trim()) {
    // Strip PostgREST .or() delimiter/grouping characters ( , ( ) " ) before
    // escaping SQL LIKE wildcards, otherwise a crafted query could inject
    // extra filter clauses and be used as a boolean oracle.
    const term = q.trim().replace(/[,()"]/g, '').replace(/[%_\\]/g, '\\$&');
    query = query.or(
      `name.ilike.%${term}%,location.ilike.%${term}%,city.ilike.%${term}%,state.ilike.%${term}%,country.ilike.%${term}%,organizer_name.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching tournaments:', error);
    return {
      tournaments: [],
      total: 0,
      page: safePage,
      limit: safeLimit,
      totalPages: 0,
      hasMore: false,
    };
  }

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    tournaments: data || [],
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    hasMore: safePage < totalPages,
  };
}

// Ranking sees a bounded candidate pool rather than the full upcoming table,
// same reasoning as MAP_PAGE_SIZE above: score/sort work is O(n), and a
// player's next few weeks of relevant tournaments are almost always in the
// nearest chunk by date anyway.
const RECOMMENDATION_CANDIDATE_POOL = 150;
const RECOMMENDATION_DEFAULT_LIMIT = 6;

const WISHLIST_SIGNAL_FIELDS = 'id, category, country_code';

/**
 * Personalized recommendations for one player (issue #127). Scores a bounded
 * upcoming-tournament candidate pool with `scoreTournamentForPlayer` (see
 * `lib/ranking.ts` for what that scoring actually is, and importantly, what
 * it isn't) and returns the top `limit` by score, descending.
 *
 * Reads the player's own preference fields and wishlist via the shared
 * browser client, matching the RLS-scoped read pattern already used by
 * `app/player/dashboard/page.tsx` for its own wishlist section, rather than
 * introducing a second, parallel auth path for this one query. Callers must
 * only invoke this for the currently authenticated player's own id; there is
 * no server-side authorization check inside this function.
 *
 * Errors (missing player row, failed queries) degrade to an empty
 * preference set or an empty result rather than throwing, consistent with
 * the other query functions in this file.
 */
export async function getPersonalizedTournaments(
  playerId: string,
  limit: number = RECOMMENDATION_DEFAULT_LIMIT
): Promise<TournamentListItem[]> {
  const [playerResult, wishlistIdsResult, candidatesResult] = await Promise.all([
    supabase
      .from('players')
      .select('home_country_code, notify_categories, min_fide_rated, rating')
      .eq('id', playerId)
      .maybeSingle(),
    supabase
      .from('player_favorite_tournaments')
      .select('tournament_id')
      .eq('player_id', playerId),
    getUpcomingTournaments(1, RECOMMENDATION_CANDIDATE_POOL),
  ]);

  if (playerResult.error) {
    console.error('Error fetching player preferences for ranking:', playerResult.error);
  }
  if (wishlistIdsResult.error) {
    console.error('Error fetching wishlist for ranking:', wishlistIdsResult.error);
  }

  const player: PlayerRankingPreferences = playerResult.data ?? {};

  const wishlistTournamentIds = (wishlistIdsResult.data || []).map((row) => row.tournament_id);

  let wishlist: TournamentListItem[] = [];
  if (wishlistTournamentIds.length > 0) {
    const { data: wishlistData, error: wishlistError } = await supabase
      .from('tournaments')
      .select(WISHLIST_SIGNAL_FIELDS)
      .in('id', wishlistTournamentIds);

    if (wishlistError) {
      console.error('Error fetching wishlisted tournaments for ranking:', wishlistError);
    } else {
      wishlist = (wishlistData || []) as unknown as TournamentListItem[];
    }
  }

  const candidates = candidatesResult.tournaments;

  return candidates
    .map((tournament) => ({
      tournament,
      score: scoreTournamentForPlayer(tournament, player, wishlist),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.tournament);
}
