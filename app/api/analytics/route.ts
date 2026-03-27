import { NextRequest, NextResponse } from 'next/server';

const WEBSITE_ID = '5807c73a-efa2-41ec-8b88-f8708a429f75';
const BASE_URL = 'https://api.umami.is/v1';

function getDateRange(range: string): { startAt: number; endAt: number } {
  const now = Date.now();
  const ms: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return { startAt: now - (ms[range] ?? ms['7d']), endAt: now };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.UMAMI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const range = request.nextUrl.searchParams.get('range') ?? '7d';
  const { startAt, endAt } = getDateRange(range);

  const headers: Record<string, string> = { 'x-umami-api-key': apiKey };
  const base = `startAt=${startAt}&endAt=${endAt}`;

  const [stats, pageviews, topPages, topReferrers, topCountries] = await Promise.all([
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/stats?${base}`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/pageviews?${base}&unit=day&timezone=Asia/Kolkata`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/metrics?${base}&type=url&limit=10`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/metrics?${base}&type=referrer&limit=10`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/websites/${WEBSITE_ID}/metrics?${base}&type=country&limit=10`, { headers }).then(r => r.json()),
  ]);

  return NextResponse.json(
    { stats, pageviews, topPages, topReferrers, topCountries },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
