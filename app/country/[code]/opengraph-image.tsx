import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';
import { eventCountLabel } from '@/lib/og-label';
import { COUNTRY_NAMES, getCountryName } from '../../lib/metadata';

export const alt = 'Chess tournaments by country on TourneyRadar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// The event count changes with every scrape, so refresh the card every 30 minutes.
export const revalidate = 1800;

type Props = {
  params: Promise<{ code: string }>;
};

export default async function Image({ params }: Props) {
  const { code } = await params;
  const countryCode = code.toUpperCase();
  const known = Boolean(COUNTRY_NAMES[countryCode]);
  const countryName = known ? getCountryName(countryCode) : 'TourneyRadar';

  let count = 0;
  if (known) {
    const today = new Date().toISOString().split('T')[0];
    const { count: total } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .eq('country_code', countryCode)
      .gte('date', today)
      .eq('status', 'published');
    count = total ?? 0;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, opacity: 0.9 }}>TourneyRadar</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 40, opacity: 0.85, marginBottom: 12 }}>
            Chess tournaments in
          </div>
          <div style={{ display: 'flex', fontSize: 108, fontWeight: 800, lineHeight: 1.05 }}>{countryName}</div>
          <div style={{ display: 'flex', fontSize: 44, marginTop: 28, color: '#bfdbfe' }}>
            {eventCountLabel(count)}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 30, opacity: 0.8 }}>tourneyradar.com</div>
      </div>
    ),
    { ...size }
  );
}
