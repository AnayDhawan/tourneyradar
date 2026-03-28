import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('country_code')
    .eq('status', 'published')
    .not('country_code', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const code = row.country_code as string;
    counts[code] = (counts[code] ?? 0) + 1;
  }

  return NextResponse.json(counts, {
    headers: { 'Cache-Control': 's-maxage=3600' },
  });
}
