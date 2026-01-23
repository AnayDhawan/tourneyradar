import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import TournamentsClient from './TournamentsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Chess Tournaments',
  description: 'Browse and filter 500+ upcoming chess tournaments worldwide. Filter by country, format, date, and FIDE rating status.',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getCachedTournaments = unstable_cache(
  async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, organizers(id, name, verified_badge)')
      .gte('date', today)
      .eq('status', 'published')
      .order('date', { ascending: true });
    
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
