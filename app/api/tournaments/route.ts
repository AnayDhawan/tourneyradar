import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const OPTIMIZED_SELECT = `
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://htohprkfygyzvgzijvnd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2hwcmtmeWd5enZnemlqdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDY3MDMsImV4cCI6MjA4MjIyMjcwM30.4TYIhteDvauPVtWbWp_Dql3VgJcYsdhgYq65Z6kGDfA";

export async function GET(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const upcoming = searchParams.get('upcoming') !== 'false';
  const limit = parseInt(searchParams.get('limit') || '100');
  
  let query = supabase
    .from('tournaments')
    .select(OPTIMIZED_SELECT)
    .eq('status', 'published');
  
  const today = new Date().toISOString().split('T')[0];
  if (upcoming) {
    query = query.gte('date', today).order('date', { ascending: true });
  } else {
    query = query.lt('date', today).order('date', { ascending: false });
  }
  
  if (country) {
    query = query.eq('country_code', country.toUpperCase());
  }
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ tournaments: data }, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    }
  });
}
