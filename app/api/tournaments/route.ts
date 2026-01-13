import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const upcoming = searchParams.get('upcoming') !== 'false';
  const limit = parseInt(searchParams.get('limit') || '100');
  
  let query = supabase
    .from('tournaments')
    .select('*')
    .eq('status', 'published');
  
  // Filter by date
  const today = new Date().toISOString().split('T')[0];
  if (upcoming) {
    query = query.gte('date', today).order('date', { ascending: true });
  } else {
    query = query.lt('date', today).order('date', { ascending: false });
  }
  
  // Filter by country if provided
  if (country) {
    query = query.eq('country_code', country.toUpperCase());
  }
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ tournaments: data });
}
