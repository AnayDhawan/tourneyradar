// Live dataset export (issue #130). Streams a fresh CSV or NDJSON of the
// `tournaments` table on request instead of relying on a separately hosted
// static file, so the dataset never drifts from the live site and needs no
// extra hosting.
//
// This is public data already (the map on / shows all of it), but a plain
// unguarded full-table export is still a burst-load risk: nothing stops a
// script from hitting it in a loop. unstable_cache holds one built payload
// per format for an hour (same 1hr revalidate app/status/page.tsx uses for
// its own scraper_logs read), so a burst of requests inside that window
// costs one Supabase query total, not one per request.

import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { fetchDatasetRows, toCSV, toNDJSON } from '@/lib/dataset';

const getCachedRows = unstable_cache(
  async () => fetchDatasetRows(supabase),
  ['dataset-export-rows'],
  { revalidate: 3600, tags: ['tournaments'] }
);

const FILENAME_BASE = 'tourneyradar-tournaments';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') ?? 'csv').toLowerCase();

  if (format !== 'csv' && format !== 'ndjson') {
    return NextResponse.json(
      { error: "format must be 'csv' or 'ndjson'" },
      { status: 400 }
    );
  }

  const rows = await getCachedRows();
  const body = format === 'csv' ? toCSV(rows) : toNDJSON(rows);
  const contentType =
    format === 'csv' ? 'text/csv; charset=utf-8' : 'application/x-ndjson; charset=utf-8';
  const extension = format === 'csv' ? 'csv' : 'ndjson';

  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${FILENAME_BASE}.${extension}"`,
      // Edge/browser caching on top of the server-side unstable_cache, same
      // shape as app/api/tournaments/route.ts.
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
