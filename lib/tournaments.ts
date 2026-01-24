import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://htohprkfygyzvgzijvnd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2hwcmtmeWd5enZnemlqdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDY3MDMsImV4cCI6MjA4MjIyMjcwM30.4TYIhteDvauPVtWbWp_Dql3VgJcYsdhgYq65Z6kGDfA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT_FIELDS, { count: 'exact' })
    .gte('date', today)
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
  const today = new Date().toISOString().split('T')[0];

  const [totalResult, countriesResult, mappedResult] = await Promise.all([
    supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .gte('date', today)
      .eq('status', 'published'),
    
    supabase
      .from('tournaments')
      .select('country_code')
      .gte('date', today)
      .eq('status', 'published'),
    
    supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .gte('date', today)
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
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT_FIELDS)
    .gte('date', today)
    .eq('status', 'published')
    .order('date', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching all tournaments:', error);
    return [];
  }

  return data || [];
}
