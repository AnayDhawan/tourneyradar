import { NextRequest, NextResponse } from 'next/server';
import { feedPath } from '@/lib/calendar-feed';
import { ensureFeedToken, getFeedToken, rotateFeedToken } from '@/lib/calendar-feed-server';
import { getAuthenticatedPlayer } from '@/lib/supabase-server';

// Manages the signed-in player's private wishlist calendar feed. The player id
// comes from the verified access token only; nothing in the URL or body can
// point these handlers at another account. Responses carry the secret feed path,
// so they are never cacheable and the token is never logged.
const UNAUTHORIZED = { error: 'Authentication required' };
const SERVER_ERROR = { error: 'Internal server error' };
const NO_STORE = { 'Cache-Control': 'private, no-store' };

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown';
}

/** Current feed, or `{ path: null }` when the player has not enabled it. */
export async function GET(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) return NextResponse.json(UNAUTHORIZED, { status: 401, headers: NO_STORE });

  try {
    const token = await getFeedToken(player.playerId);
    return NextResponse.json({ path: token ? feedPath(token) : null }, { headers: NO_STORE });
  } catch (error) {
    console.error('Reading calendar feed failed:', describe(error));
    return NextResponse.json(SERVER_ERROR, { status: 500, headers: NO_STORE });
  }
}

/** Enables the feed. Idempotent: an existing feed keeps its token. */
export async function POST(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) return NextResponse.json(UNAUTHORIZED, { status: 401, headers: NO_STORE });

  try {
    const token = await ensureFeedToken(player.playerId);
    return NextResponse.json({ path: feedPath(token) }, { headers: NO_STORE });
  } catch (error) {
    console.error('Enabling calendar feed failed:', describe(error));
    return NextResponse.json(SERVER_ERROR, { status: 500, headers: NO_STORE });
  }
}

/** Regenerates the token. The previous URL stops working immediately. */
export async function PUT(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) return NextResponse.json(UNAUTHORIZED, { status: 401, headers: NO_STORE });

  try {
    const token = await rotateFeedToken(player.playerId);
    return NextResponse.json({ path: feedPath(token) }, { headers: NO_STORE });
  } catch (error) {
    console.error('Regenerating calendar feed failed:', describe(error));
    return NextResponse.json(SERVER_ERROR, { status: 500, headers: NO_STORE });
  }
}
