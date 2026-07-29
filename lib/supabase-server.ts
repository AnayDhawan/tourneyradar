import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
  );
}

// Route handlers must never trust a player id supplied by the caller. This
// builds a request-scoped client bound to the caller's own access token, so
// every query it makes runs as that user and RLS applies to it.
function clientForToken(accessToken: string) {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim() || null;
}

export interface AuthenticatedPlayer {
  playerId: string;
  authUserId: string;
  supabase: ReturnType<typeof clientForToken>;
}

/**
 * Resolves the calling player from the request's bearer token.
 *
 * Returns null when the token is absent, invalid, expired, or belongs to an
 * authenticated user with no matching row in `players`. Callers must treat
 * null as 401 and must derive the player id from here rather than from any
 * query string or request body value.
 */
export async function getAuthenticatedPlayer(
  request: NextRequest
): Promise<AuthenticatedPlayer | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const scoped = clientForToken(token);

  const {
    data: { user },
    error: userError,
  } = await scoped.auth.getUser(token);

  if (userError || !user) return null;

  const { data: player, error: playerError } = await scoped
    .from('players')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (playerError || !player) return null;

  return { playerId: player.id, authUserId: user.id, supabase: scoped };
}
