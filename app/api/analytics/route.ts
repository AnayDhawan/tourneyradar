import { NextRequest, NextResponse } from 'next/server';

const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID ?? '';
const BASE_URL = process.env.UMAMI_BASE_URL ?? '';

function getDateRange(range: string): { startAt: number; endAt: number; unit: string } {
  const now = Date.now();
  if (range === 'all') return { startAt: 1672531200000, endAt: now, unit: 'month' };
  if (range === '1y') return { startAt: now - 365 * 24 * 60 * 60 * 1000, endAt: now, unit: 'day' };
  if (range === '6m') return { startAt: now - 180 * 24 * 60 * 60 * 1000, endAt: now, unit: 'month' };
  if (range === '30d') return { startAt: now - 30 * 24 * 60 * 60 * 1000, endAt: now, unit: 'day' };
  if (range === '7d') return { startAt: now - 7 * 24 * 60 * 60 * 1000, endAt: now, unit: 'day' };
  return { startAt: now - 24 * 60 * 60 * 1000, endAt: now, unit: 'hour' };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.UMAMI_API_KEY;
  if (!apiKey || !WEBSITE_ID || !BASE_URL) {
    return NextResponse.json({ error: 'Analytics not configured' }, { status: 500 });
  }

  const range = request.nextUrl.searchParams.get('range') ?? '7d';
  const { startAt, endAt, unit } = getDateRange(range);

  const headers: Record<string, string> = { 'x-umami-api-key': apiKey };
  const base = `startAt=${startAt}&endAt=${endAt}`;

  const [statsRes, pageviewsRes, countriesRes] = await Promise.all([
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/stats?${base}`, { headers }),
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/pageviews?${base}&unit=${unit}&timezone=Asia/Kolkata`, { headers }),
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/metrics?${base}&type=country&limit=100`, { headers }),
  ]);

  const [stats, pageviews, topCountries] = await Promise.all([
    statsRes.json(),
    pageviewsRes.json(),
    countriesRes.json(),
  ]);

  const normalizedPageviews = {
    pageviews: Array.isArray(pageviews?.pageviews) ? pageviews.pageviews : [],
    sessions: Array.isArray(pageviews?.sessions) ? pageviews.sessions : [],
  };
  const normalizedCountries = Array.isArray(topCountries) ? topCountries : [];

  return NextResponse.json(
    { stats, pageviews: normalizedPageviews, topCountries: normalizedCountries },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
