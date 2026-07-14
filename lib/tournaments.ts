import { supabase } from './supabase';

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
    return [];
  }

  return data || [];
}
