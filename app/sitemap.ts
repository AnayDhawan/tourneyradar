import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://htohprkfygyzvgzijvnd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b2hwcmtmeWd5enZnemlqdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDY3MDMsImV4cCI6MjA4MjIyMjcwM30.4TYIhteDvauPVtWbWp_Dql3VgJcYsdhgYq65Z6kGDfA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.tourneyradar.com';
  const today = new Date().toISOString().split('T')[0];

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/tournaments`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tournaments/completed`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  try {
    const [tournamentsResult, countriesResult] = await Promise.all([
      supabase
        .from('tournaments')
        .select('id, scraped_at')
        .gte('date', today)
        .eq('status', 'published')
        .order('date', { ascending: true })
        .limit(5000),
      supabase
        .from('tournaments')
        .select('country_code')
        .gte('date', today)
        .eq('status', 'published'),
    ]);

    const tournaments = tournamentsResult.data || [];
    const countries = countriesResult.data || [];

    const tournamentPages: MetadataRoute.Sitemap = tournaments.map((t) => ({
      url: `${baseUrl}/tournaments/${t.id}`,
      lastModified: t.scraped_at ? new Date(t.scraped_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const uniqueCountries = [...new Set(countries.map(c => c.country_code).filter(Boolean))];
    const countryPages: MetadataRoute.Sitemap = uniqueCountries.map((code) => ({
      url: `${baseUrl}/country/${code.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...countryPages, ...tournamentPages];
  } catch (error) {
    console.error('Sitemap error:', error);
    return staticPages;
  }
}
