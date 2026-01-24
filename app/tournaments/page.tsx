import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import TournamentsClient from './TournamentsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Chess Tournaments',
  description: 'Browse and filter 500+ upcoming chess tournaments worldwide. Filter by country, format, date, and FIDE rating status.',
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://htohprkfygyzvgzijvnd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2hwcmtmeWd5enZnemlqdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDY3MDMsImV4cCI6MjA4MjIyMjcwM30.4TYIhteDvauPVtWbWp_Dql3VgJcYsdhgYq65Z6kGDfA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OPTIMIZED_SELECT = `
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
  organizer_name,
  created_at
`;

const getCachedTournaments = unstable_cache(
  async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('tournaments')
      .select(OPTIMIZED_SELECT)
      .gte('date', today)
      .eq('status', 'published')
      .order('date', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error:', error);
      return [];
    }
    
    return data || [];
  },
  ['tournaments-list'],
  { revalidate: 300, tags: ['tournaments'] }
);

export default async function TournamentsPage() {
  const tournaments = await getCachedTournaments();
  return <TournamentsClient initialTournaments={tournaments} />;
}
