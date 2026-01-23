import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import TournamentDetailClient from './TournamentDetailClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, date, city, country, country_code, category, fide_rated')
    .eq('id', id)
    .single();

  if (!tournament) {
    return {
      title: 'Tournament Not Found',
      description: 'The requested tournament could not be found.',
    };
  }

  const location = [tournament.city, tournament.country_code].filter(Boolean).join(', ');
  const date = new Date(tournament.date).toLocaleDateString('en-US', { 
    month: 'long', day: 'numeric', year: 'numeric' 
  });
  
  const title = `${tournament.name} | ${tournament.category} Chess Tournament`;
  const description = `${tournament.name} - ${tournament.category} chess tournament on ${date} in ${location}. ${tournament.fide_rated ? 'FIDE Rated.' : ''} View details and registration info on TourneyRadar.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://www.tourneyradar.com/tournaments/${id}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

async function getTournament(id: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const tournament = await getTournament(id);
  
  return <TournamentDetailClient tournament={tournament} />;
}
