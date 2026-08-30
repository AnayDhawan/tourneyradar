import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedPlayer } from '@/lib/supabase-server';
import { fetchFideRatingHistory, type FideRatingPoint } from '@/lib/fide';

// Issue #128: on-demand FIDE rating history for the signed-in player's own
// dashboard. Never hits FIDE live on every page load, since a_chart_data.phtml
// is an undocumented internal endpoint with no rate-limit guarantee (see
// lib/fide.ts) -- a cached row less than 24h old is served straight from
// fide_rating_history instead.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

interface CacheRow {
  period: string;
  standard: number | null;
  rapid: number | null;
  blitz: number | null;
  fetched_at: string;
}

function toPoints(rows: CacheRow[]): FideRatingPoint[] {
  return rows.map((row) => ({
    period: row.period,
    standard: row.standard,
    rapid: row.rapid,
    blitz: row.blitz,
  }));
}

export async function GET(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: playerRow, error: playerError } = await player.supabase
    .from('players')
    .select('fide_id')
    .eq('id', player.playerId)
    .maybeSingle();

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  const fideId = (playerRow?.fide_id as string | null)?.trim() || null;
  if (!fideId) {
    return NextResponse.json({ history: [], fide_id: null });
  }

  // Public-read policy on fide_rating_history means the caller's own
  // RLS-scoped client can read this without needing the service role.
  const { data: cachedRows, error: cacheError } = await player.supabase
    .from('fide_rating_history')
    .select('period, standard, rapid, blitz, fetched_at')
    .eq('fide_id', fideId)
    .order('period', { ascending: true });

  if (cacheError) {
    console.error('Error reading fide_rating_history cache:', cacheError);
  }

  const rows = (cachedRows || []) as CacheRow[];
  const newestFetch = rows.reduce<number>((max, row) => {
    const t = new Date(row.fetched_at).getTime();
    return Number.isFinite(t) ? Math.max(max, t) : max;
  }, 0);
  const isFresh = rows.length > 0 && Date.now() - newestFetch < CACHE_TTL_MS;

  if (isFresh) {
    return NextResponse.json({ history: toPoints(rows), fide_id: fideId, source: 'cache' });
  }

  const liveHistory = await fetchFideRatingHistory(fideId);

  if (liveHistory.length === 0) {
    // FIDE unreachable, endpoint changed, or a genuinely unknown/invalid
    // fide_id. Fall back to whatever cache exists (even if stale) rather
    // than showing nothing when we actually have older data to show.
    return NextResponse.json({
      history: toPoints(rows),
      fide_id: fideId,
      source: rows.length > 0 ? 'stale-cache' : 'unavailable',
    });
  }

  // Writes go through the service role client: the public-read RLS policy on
  // fide_rating_history deliberately grants no insert/update to anon or
  // authenticated (see the migration), so this cache can only be populated
  // server-side.
  const admin = serviceClient();
  const upsertRows = liveHistory.map((point) => ({
    player_id: player.playerId,
    fide_id: fideId,
    period: point.period,
    standard: point.standard,
    rapid: point.rapid,
    blitz: point.blitz,
    fetched_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await admin
    .from('fide_rating_history')
    .upsert(upsertRows, { onConflict: 'fide_id,period' });

  if (upsertError) {
    // Cache write failed (e.g. migration not applied yet) -- still return
    // the freshly fetched data to the caller, just without caching it.
    console.error('Error caching fide_rating_history:', upsertError);
  }

  return NextResponse.json({ history: liveHistory, fide_id: fideId, source: 'live' });
}
