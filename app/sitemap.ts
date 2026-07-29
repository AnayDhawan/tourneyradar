import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

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
