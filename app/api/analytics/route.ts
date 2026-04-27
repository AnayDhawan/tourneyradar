import { NextRequest, NextResponse } from 'next/server';

const WEBSITE_ID = '5807c73a-efa2-41ec-8b88-f8708a429f75';
const BASE_URL = 'https://api.umami.is/v1';

function getDateRange(range: string): { startAt: number; endAt: number; unit: string } {
  const now = Date.now();
  if (range === 'all') return { startAt: 1672531200000, endAt: now, unit: 'month' };
  if (range === '1y') return { startAt: now - 365 * 24 * 60 * 60 * 1000, endAt: now, unit: 'day' };
  if (range === '6m') return { startAt: now - 180 * 24 * 60 * 60 * 1000, endAt: now, unit: 'day' };
  if (range === '30d') return { startAt: now - 30 * 24 * 60 * 60 * 1000, endAt: now, unit: 'day' };
  if (range === '7d') return { startAt: now - 7 * 24 * 60 * 60 * 1000, endAt: now, unit: 'hour' };
  return { startAt: now - 24 * 60 * 60 * 1000, endAt: now, unit: 'hour' };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.UMAMI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const range = request.nextUrl.searchParams.get('range') ?? '7d';
  const { startAt, endAt, unit } = getDateRange(range);

  const headers: Record<string, string> = { 'x-umami-api-key': apiKey };
  const base = `startAt=${startAt}&endAt=${endAt}`;

  const [stats, pageviews, topCountries] = await Promise.all([
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/stats?${base}`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/pageviews?${base}&unit=${unit}&timezone=Asia/Kolkata`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/metrics?${base}&type=country&limit=100`, { headers }).then(r => r.json()),
  ]);

  return NextResponse.json(
    { stats, pageviews, topCountries },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
