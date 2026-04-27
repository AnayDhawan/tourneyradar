import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('country_code')
    .eq('status', 'published')
    .not('country_code', 'is', null);

  if (error) {
    return NextResponse.json({}, { status: 500 });
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.country_code) {
      counts[row.country_code] = (counts[row.country_code] ?? 0) + 1;
    }
  }

  return NextResponse.json(counts, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
