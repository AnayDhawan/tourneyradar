import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://htohprkfygyzvgzijvnd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2hwcmtmeWd5enZnemlqdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDY3MDMsImV4cCI6MjA4MjIyMjcwM30.4TYIhteDvauPVtWbWp_Dql3VgJcYsdhgYq65Z6kGDfA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
