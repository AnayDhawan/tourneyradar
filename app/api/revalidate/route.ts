import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

// Called by the scrape workflow once the merged data is written, so cached
// pages (home, dataset, API caches that carry the `tournaments` tag) refresh
// right away instead of waiting out their TTL. Locked to the same bearer
// secret as the cron route. With no secret configured it refuses every
// request, so it can never be an open cache-purge endpoint.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Revalidation is not configured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // "max" serves the stale page while the fresh one is built in the background.
  revalidateTag('tournaments', 'max');
  return NextResponse.json({ revalidated: true, tag: 'tournaments', at: new Date().toISOString() });
}
