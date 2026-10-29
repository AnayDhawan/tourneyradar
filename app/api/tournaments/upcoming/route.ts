import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  MAX_PAGE_LIMIT,
  UPCOMING_DEFAULT_LIMIT,
  parseBounded,
  parseUpcomingBody,
} from '@/lib/api-params';

const UPCOMING_COLUMNS = `
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

// Published tournaments dated today or later, soonest first, for one page.
function upcomingQuery(start: number, end: number) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('tournaments')
    .select(UPCOMING_COLUMNS, { count: 'exact' })
    .gte('date', today)
    .eq('status', 'published')
    .order('date', { ascending: true })
    .order('created_at', { ascending: false })
    .range(start, end);
}

// The database's own message can name tables or columns, so callers only get a
// generic one. The detail is logged on the server.
function queryFailed(error: unknown) {
  console.error('[api/tournaments/upcoming] query failed', error);
  return Response.json({ error: 'Failed to load tournaments' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const pageParam = parseBounded(searchParams.get('page'), 'page');
  if (pageParam.error) {
    return Response.json({ error: pageParam.error }, { status: 400 });
  }
  const limitParam = parseBounded(searchParams.get('limit'), 'limit');
  if (limitParam.error) {
    return Response.json({ error: limitParam.error }, { status: 400 });
  }

  const page = pageParam.value ?? 1;
  // Clamp, and report the value actually used.
  const limit = Math.min(limitParam.value ?? UPCOMING_DEFAULT_LIMIT, MAX_PAGE_LIMIT);
  const country = searchParams.get('country');
  const category = searchParams.get('category');

  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = upcomingQuery(start, end);

  if (country) {
    query = query.eq('country_code', country.toUpperCase());
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;

  if (error) {
    return queryFailed(error);
  }

  return Response.json({
    tournaments: data,
    total: count || 0,
    page,
    limit,
    hasMore: (count || 0) > end + 1
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      'CDN-Cache-Control': 'max-age=3600'
    }
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseUpcomingBody(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { countries, category, page, limit } = parsed.value;

  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = upcomingQuery(start, end);

  if (countries && countries.length > 0) {
    query = query.in('country_code', countries);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;

  if (error) {
    return queryFailed(error);
  }

  return Response.json({
    tournaments: data,
    total: count || 0,
    page,
    limit,
    hasMore: (count || 0) > end + 1
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
    }
  });
}
