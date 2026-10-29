import { NextRequest, NextResponse } from 'next/server';
import { queryTournaments } from '@/lib/tournaments';
import { parseBounded } from '@/lib/api-params';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const limit = parseBounded(searchParams.get('limit'), 'limit');
  if (limit.error) {
    return NextResponse.json({ error: limit.error }, { status: 400 });
  }

  const page = parseBounded(searchParams.get('page'), 'page');
  if (page.error) {
    return NextResponse.json({ error: page.error }, { status: 400 });
  }

  const result = await queryTournaments({
    limit: limit.value,
    page: page.value,
    country: searchParams.get('country'),
    q: searchParams.get('q'),
  });

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
