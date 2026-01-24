import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import HomePageClient from './HomePageClient';
import { generateOrganizationJsonLd, generateWebsiteJsonLd } from '@/app/lib/metadata';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://htohprkfygyzvgzijvnd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2hwcmtmeWd5enZnemlqdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDY3MDMsImV4cCI6MjA4MjIyMjcwM30.4TYIhteDvauPVtWbWp_Dql3VgJcYsdhgYq65Z6kGDfA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const getCachedTournaments = unstable_cache(
  async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('tournaments')
      .select('id, name, date, end_date, city, state, country, country_code, lat, lng, category, fide_rated, source_url, external_link, location')
      .gte('date', today)
      .eq('status', 'published')
      .order('date', { ascending: true })
      .limit(1000);
    
    if (error) {
      console.error('Supabase error:', error);
      return [];
    }
    
    return data || [];
  },
  ['home-tournaments'],
  { 
    revalidate: 300,
    tags: ['tournaments']
  }
);

const getCachedStats = unstable_cache(
  async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { count: totalCount } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .gte('date', today)
      .eq('status', 'published');
    
    const { data: countries } = await supabase
      .from('tournaments')
      .select('country_code')
      .gte('date', today)
      .eq('status', 'published');
    
    const uniqueCountries = new Set(countries?.map(c => c.country_code).filter(Boolean));
    
    const { count: mappedCount } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .gte('date', today)
      .eq('status', 'published')
      .not('lat', 'is', null)
      .not('lng', 'is', null);
    
    return {
      total: totalCount || 0,
      countries: uniqueCountries.size,
      mapped: mappedCount || 0
    };
  },
  ['home-stats'],
  { revalidate: 300, tags: ['tournaments'] }
);

export default async function HomePage() {
  const [tournaments, stats] = await Promise.all([
    getCachedTournaments(),
    getCachedStats()
  ]);
  
  const websiteJsonLd = generateWebsiteJsonLd();
  const organizationJsonLd = generateOrganizationJsonLd();
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HomePageClient 
        initialTournaments={tournaments} 
        stats={stats}
      />
    </>
  );
}