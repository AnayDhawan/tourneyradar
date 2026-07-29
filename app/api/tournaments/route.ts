import { NextRequest, NextResponse } from 'next/server';
import { queryTournaments } from '@/lib/tournaments';

// queryTournaments clamps limit and page defensively, but silently coercing a
// bad value hides caller bugs and makes the API look like it accepted input it
// actually ignored. Reject anything non-numeric up front and let the clamp
// handle the merely-too-large case.
function parseBounded(
  raw: string | null,
  name: string
): { value?: number; error?: string } {
  if (raw === null || raw === '') return {};

  if (!/^\d+$/.test(raw)) {
    return { error: `${name} must be a positive integer` };
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    return { error: `${name} must be a positive integer` };
  }

  return { value };
}

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
