import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('id, scraped_at')
      .gte('date', today)
      .eq('status', 'published')
      .limit(1000);

    const tournamentPages: MetadataRoute.Sitemap = (tournaments || []).map((t) => ({
      url: `${baseUrl}/tournaments/${t.id}`,
      lastModified: t.scraped_at ? new Date(t.scraped_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...tournamentPages];
  } catch (error) {
    console.error('Sitemap error:', error);
    return staticPages;
  }
}
