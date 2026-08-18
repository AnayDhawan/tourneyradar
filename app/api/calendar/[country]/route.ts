import { supabase } from '@/lib/supabase';
import { countryCodeToName } from '@/lib/countryMap';
import { icsEscape, foldLine, dayAfter, icsDate } from '@/lib/ics-feed';

// Never prerender: the feed must reflect the latest scraped tournaments.
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tourneyradar.com';
const ICS_MAX_TOURNAMENTS = 200;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ country: string }> }
) {
  const { country } = await params;
  const code = country.replace(/\.ics$/i, '').toUpperCase();

  if (!/^[A-Z]{2,3}$/.test(code) || !countryCodeToName(code)) {
    return new Response('Unknown country code', { status: 404 });
  }

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, date, end_date, city, state, country, country_code')
    .eq('country_code', code)
    .eq('status', 'published')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(ICS_MAX_TOURNAMENTS);

  if (error) {
    console.error('Error fetching tournaments for ICS feed:', error);
    return new Response('Internal server error', { status: 500 });
  }

  const dtstamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  const events = (data || []).map((t) => {
    const endDay = dayAfter(t.end_date || t.date);
    const locationParts = [t.city, t.state, t.country].filter(Boolean);
    const description = [
      `Location: ${locationParts.join(', ') || 'TBA'}`,
      `Link: ${SITE_URL}/tournaments/${t.id}`,
    ].join('\\n');

    return [
      'BEGIN:VEVENT',
      `UID:tournament-${t.id}@tourneyradar.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${icsDate(t.date)}`,
      `DTEND;VALUE=DATE:${icsDate(endDay)}`,
      `SUMMARY:${icsEscape(t.name)}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${icsEscape(locationParts.join(', '))}`,
      'END:VEVENT',
    ]
      .map(foldLine)
      .join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TourneyRadar//TourneyRadar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Chess Tournaments - ${countryCodeToName(code)}`,
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${code.toLowerCase()}-tournaments.ics"`,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
