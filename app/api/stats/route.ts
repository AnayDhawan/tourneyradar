import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Period = 'today' | 'week' | 'month' | '6month' | 'lifetime';

function getPeriodStart(period: Period): string | null {
  const now = new Date();
  switch (period) {
    case 'today': {
      return now.toISOString().split('T')[0];
    }
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return d.toISOString().split('T')[0];
    }
    case 'month': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return d.toISOString().split('T')[0];
    }
    case '6month': {
      const d = new Date(now);
      d.setDate(d.getDate() - 179);
      return d.toISOString().split('T')[0];
    }
    case 'lifetime':
    default:
      return null;
  }
}

function getDaysInPeriod(period: Period): number {
  switch (period) {
    case 'today':   return 1;
    case 'week':    return 7;
    case 'month':   return 30;
    case '6month':  return 180;
    case 'lifetime': return 0;
  }
}

// How many days to show in the chart for each period
function getChartDays(period: Period): number {
  switch (period) {
    case 'today':   return 1;
    case 'week':    return 7;
    case 'month':   return 30;
    case '6month':  return 180;
    case 'lifetime': return 365; // cap chart at 1 year even for lifetime
  }
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') ?? 'month') as Period;
  const chart = searchParams.get('chart') === 'true';

  const periodStart = getPeriodStart(period);

  const baseQuery = () => {
    const q = supabase.from('page_views').select('*');
    return periodStart ? q.gte('created_at', periodStart) : q;
  };

  void baseQuery;

  const [totalResult, uniqueResult, topPathsResult] = await Promise.all([
    periodStart
      ? supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', periodStart)
      : supabase.from('page_views').select('*', { count: 'exact', head: true }),
    periodStart
      ? supabase.from('page_views').select('session_id').gte('created_at', periodStart)
      : supabase.from('page_views').select('session_id'),
    periodStart
      ? supabase.from('page_views').select('path').gte('created_at', periodStart)
      : supabase.from('page_views').select('path'),
  ]);

  const total_views = totalResult.count ?? 0;

  const unique_visitors = new Set(
    (uniqueResult.data ?? []).map((r) => r.session_id)
  ).size;

  const pathCounts: Record<string, number> = {};
  for (const { path } of (topPathsResult.data ?? [])) {
    pathCounts[path] = (pathCounts[path] ?? 0) + 1;
  }
  const top_paths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  const days = getDaysInPeriod(period);
  const avg_daily_views = days > 0 ? Math.round(total_views / days) : total_views;

  const base = {
    total_views,
    unique_visitors,
    avg_daily_views,
    top_paths,
    period,
  };

  if (!chart) {
    return NextResponse.json(base, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  }

  // Build daily_breakdown — pre-fill every day in the window with zeros
  const chartDays = getChartDays(period);
  const chartStart = new Date();
  chartStart.setDate(chartStart.getDate() - (chartDays - 1));
  const chartStartStr = chartStart.toISOString().split('T')[0];

  const { data: rawRows } = await supabase
    .from('page_views')
    .select('created_at, session_id')
    .gte('created_at', chartStartStr);

  const byDate: Record<string, { views: number; sessions: Set<string> }> = {};
  for (let i = 0; i < chartDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (chartDays - 1 - i));
    byDate[d.toISOString().split('T')[0]] = { views: 0, sessions: new Set() };
  }

  for (const row of rawRows ?? []) {
    const date = row.created_at.slice(0, 10);
    if (!byDate[date]) continue;
    byDate[date].views++;
    byDate[date].sessions.add(row.session_id);
  }

  const daily_breakdown = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { views, sessions }]) => ({
      date,
      views,
      visitors: sessions.size,
    }));

  return NextResponse.json(
    { ...base, daily_breakdown },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
