import { buildWishlistIcs, isValidFeedToken, tokenFromParam } from '@/lib/calendar-feed';
import { findPlayerIdByFeedToken, listFeedTournaments } from '@/lib/calendar-feed-server';

// Never prerender or cache: this is a per-player response and the token in the
// URL is the credential.
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tourneyradar.com';

// A calendar app is the client here and sends no session, so the token in the
// path is the whole credential. The token is never logged, never put in an error
// message, and every failure to resolve it is the same plain 404, so the response
// does not say whether a token never existed or was regenerated.
const PRIVATE_HEADERS = {
  // Not `public`: a shared cache must never serve one player's feed to another URL.
  'Cache-Control': 'private, no-store, max-age=0',
  // The token is in the path, so keep it out of Referer and out of search indexes.
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
};

function notFound() {
  return new Response('Not found', { status: 404, headers: PRIVATE_HEADERS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: param } = await params;
  const token = tokenFromParam(param);
  if (!isValidFeedToken(token)) return notFound();

  try {
    const playerId = await findPlayerIdByFeedToken(token);
    if (!playerId) return notFound();

    const today = new Date().toISOString().split('T')[0];
    const tournaments = await listFeedTournaments(playerId, today);
    const ics = buildWishlistIcs(tournaments, { siteUrl: SITE_URL });

    return new Response(ics, {
      headers: {
        ...PRIVATE_HEADERS,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="tourneyradar-wishlist.ics"',
      },
    });
  } catch (error) {
    // The message carries a step name and a Postgres code, never the token.
    console.error('Wishlist calendar feed failed:', error instanceof Error ? error.message : 'unknown');
    return new Response('Internal server error', { status: 500, headers: PRIVATE_HEADERS });
  }
}
