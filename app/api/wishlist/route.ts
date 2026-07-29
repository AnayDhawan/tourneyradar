import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedPlayer } from '@/lib/supabase-server';

// Every handler here derives the player id from the caller's verified access
// token. A player_id supplied in the query string or body is ignored, so one
// player can never read or mutate another player's wishlist.
const UNAUTHORIZED = { error: 'Authentication required' };

export async function GET(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  const { data, error } = await player.supabase
    .from('player_favorite_tournaments')
    .select('tournament_id, created_at')
    .eq('player_id', player.playerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { wishlist: data },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export async function POST(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const tournamentId = (body as { tournament_id?: unknown })?.tournament_id;
  if (typeof tournamentId !== 'string' || !tournamentId.trim()) {
    return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });
  }

  const { data, error } = await player.supabase
    .from('player_favorite_tournaments')
    .insert({ player_id: player.playerId, tournament_id: tournamentId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  const tournamentId = new URL(request.url).searchParams.get('tournament_id');
  if (!tournamentId) {
    return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });
  }

  const { error } = await player.supabase
    .from('player_favorite_tournaments')
    .delete()
    .eq('player_id', player.playerId)
    .eq('tournament_id', tournamentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
