import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

export async function GET(request: NextRequest) {
  
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const limit = parseInt(searchParams.get('limit') || '100');

  const today = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('tournaments')
    .select(OPTIMIZED_SELECT)
    .eq('status', 'published')
    .gte('date', today)
    .order('date', { ascending: true });
  
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
