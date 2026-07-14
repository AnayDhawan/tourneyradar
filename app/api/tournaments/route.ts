import { NextRequest, NextResponse } from 'next/server';
import { queryTournaments } from '@/lib/tournaments';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const q = searchParams.get('q');

  const limitParam = parseInt(searchParams.get('limit') || '', 10);
  const pageParam = parseInt(searchParams.get('page') || '', 10);

  const result = await queryTournaments({
    limit: Number.isNaN(limitParam) ? undefined : limitParam,
    page: Number.isNaN(pageParam) ? undefined : pageParam,
    country,
    q,
  });

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
