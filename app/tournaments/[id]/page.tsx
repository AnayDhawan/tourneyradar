import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TournamentDetailClient from './TournamentDetailClient';
import {
  generateTournamentJsonLd,
  generateTournamentMetadata,
  generateBreadcrumbJsonLd,
  serializeJsonLd,
} from '../../lib/metadata';
import { supabase } from '@/lib/supabase';

type Props = {
  params: Promise<{ id: string }>;
};

// Render each tournament on first request, then cache it and refresh it hourly
// (the same interval as the country pages). A cached render completes before
// the response starts, so a missing row answers with a real 404. A dynamic
// render here streams behind app/loading.tsx, so notFound() would run after
// the 200 had already been sent.
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

// One lookup per request, shared by generateMetadata and the page. Only
// published rows are public, like every other read: an unpublished or unknown
// id has no page. A database failure is thrown rather than reported as "not
// found", so an outage is never served (and cached) as a 404.
const getTournament = cache(async (id: string) => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tournament = await getTournament(id);

  if (!tournament) {
    return {
      title: 'Tournament Not Found',
      description: 'The requested tournament could not be found.',
      robots: { index: false, follow: false },
    };
  }

  return generateTournamentMetadata(tournament);
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const tournament = await getTournament(id);

  if (!tournament) {
    notFound();
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <TournamentDetailClient tournament={tournament} />
    </>
  );
}
