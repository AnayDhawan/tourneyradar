import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const country = searchParams.get('country');
  const category = searchParams.get('category');
  
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  
  const today = new Date().toISOString().split('T')[0];
  
  let query = supabase
    .from('tournaments')
    .select(`
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
    `, { count: 'exact' })
    .gte('date', today)
    .eq('status', 'published')
    .order('date', { ascending: true })
    .order('created_at', { ascending: false })
    .range(start, end);
  
  if (country) {
    query = query.eq('country_code', country.toUpperCase());
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error, count } = await query;
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();
  const { countries, category, page = 1, limit = 50 } = body;
  
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  
  const today = new Date().toISOString().split('T')[0];
  
  let query = supabase
    .from('tournaments')
    .select(`
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
    `, { count: 'exact' })
    .gte('date', today)
    .eq('status', 'published')
    .order('date', { ascending: true })
    .order('created_at', { ascending: false })
    .range(start, end);
  
  if (countries && countries.length > 0) {
    query = query.in('country_code', countries);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error, count } = await query;
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({
    tournaments: data,
    total: count || 0,
    page,
    hasMore: (count || 0) > end + 1
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
    }
  });
}
