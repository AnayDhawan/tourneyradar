import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import TournamentDetailClient from './TournamentDetailClient';
import { generateTournamentJsonLd, generateBreadcrumbJsonLd } from '../../lib/metadata';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://htohprkfygyzvgzijvnd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2hwcmtmeWd5enZnemlqdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDY3MDMsImV4cCI6MjA4MjIyMjcwM30.4TYIhteDvauPVtWbWp_Dql3VgJcYsdhgYq65Z6kGDfA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  
  if (!tournament) {
    return <TournamentDetailClient tournament={null} />;
  }

  const eventJsonLd = generateTournamentJsonLd(tournament);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://www.tourneyradar.com' },
    { name: 'Tournaments', url: 'https://www.tourneyradar.com/tournaments' },
    { name: tournament.name, url: `https://www.tourneyradar.com/tournaments/${id}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <TournamentDetailClient tournament={tournament} />
    </>
  );
}
