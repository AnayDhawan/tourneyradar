import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('player_id');
  
  if (!playerId) {
    return NextResponse.json({ error: 'player_id required' }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('player_favorite_tournaments')
    .select('tournament_id, created_at')
    .eq('player_id', playerId);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ wishlist: data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const body = await request.json();
  const { player_id, tournament_id } = body;
  
  if (!player_id || !tournament_id) {
    return NextResponse.json({ error: 'player_id and tournament_id required' }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('player_favorite_tournaments')
    .insert({ player_id, tournament_id })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, data });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('player_id');
  const tournamentId = searchParams.get('tournament_id');
  
  if (!playerId || !tournamentId) {
    return NextResponse.json({ error: 'player_id and tournament_id required' }, { status: 400 });
  }
  
  const { error } = await supabase
    .from('player_favorite_tournaments')
    .delete()
    .eq('player_id', playerId)
    .eq('tournament_id', tournamentId);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true });
}
