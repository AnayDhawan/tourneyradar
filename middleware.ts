import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-page paths
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Determine session ID — reuse existing cookie or mint a new one
  const existingSession = request.cookies.get('tr_session')?.value;
  const sessionId = existingSession ?? crypto.randomUUID();

  if (supabaseUrl && serviceKey) {
    // Fire and forget — never await, never block the page load
    fetch(`${supabaseUrl}/rest/v1/page_views`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        path: pathname,
        referrer: request.headers.get('referer') ?? null,
        session_id: sessionId,
      }),
    }).catch(() => {});
  }

  const response = NextResponse.next();

  // Set session cookie for new visitors (30-day expiry)
  if (!existingSession) {
    response.cookies.set('tr_session', sessionId, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
