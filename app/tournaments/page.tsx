import { unstable_cache } from 'next/cache';
import TournamentsClient from './TournamentsClient';
import type { Metadata } from 'next';
import { queryTournaments } from '@/lib/tournaments';
import { parseRatingParam } from '@/lib/rating-filter';

export const metadata: Metadata = {
  title: 'Browse Chess Tournaments',
  description: 'Browse and filter 1,000+ upcoming chess tournaments worldwide. Filter by country, format, date, and FIDE rating status.',
  alternates: { canonical: 'https://www.tourneyradar.com/tournaments' },
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; rating?: string | string[] }>;
}) {
  const sp = await searchParams;
  const page = parseInt(sp.page || '1', 10);
  const q = sp.q || '';
  const ratingParam = parseRatingParam(sp.rating);

  const getTournaments = unstable_cache(
    async () => queryTournaments({ page, q, rating: ratingParam.rating }),
    ['tournaments-list', String(page), q || '', String(ratingParam.rating ?? '')],
    { revalidate: 86400, tags: ['tournaments'] }
  );

  const result = await getTournaments();

  return (
    <TournamentsClient
      initialTournaments={result.tournaments}
      page={result.page}
      totalPages={result.totalPages}
      total={result.total}
      q={q}
      ratingParam={ratingParam}
    />
  );
}
