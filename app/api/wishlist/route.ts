import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedPlayer } from '@/lib/supabase-server';

// Every handler here derives the player id from the caller's verified access
// token. A player_id supplied in the query string or body is ignored, so one
// player can never read or mutate another player's wishlist.
const UNAUTHORIZED = { error: 'Authentication required' };

// Database errors are logged, never returned: their text names tables, columns
// and constraints.
const SERVER_ERROR = { error: 'Internal server error' };
const MAX_TOURNAMENT_ID_LENGTH = 100;
// Postgres unique_violation: the player already saved this tournament.
const UNIQUE_VIOLATION = '23505';

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
    console.error('Error reading wishlist:', error);
    return NextResponse.json(SERVER_ERROR, { status: 500 });
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
  if (tournamentId.length > MAX_TOURNAMENT_ID_LENGTH) {
    return NextResponse.json({ error: 'tournament_id is too long' }, { status: 400 });
  }

  const { data, error } = await player.supabase
    .from('player_favorite_tournaments')
    .insert({ player_id: player.playerId, tournament_id: tournamentId })
    .select()
    .single();

  // Saving something already saved (a second tab, a stale client) is not a
  // failure: the wishlist ends up in the state the caller asked for.
  if (error?.code === UNIQUE_VIOLATION) {
    return NextResponse.json({ success: true, already_saved: true }, { status: 200 });
  }
  if (error) {
    console.error('Error saving to wishlist:', error);
    return NextResponse.json(SERVER_ERROR, { status: 500 });
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
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(SERVER_ERROR, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
