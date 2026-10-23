import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

// Static pages change when the site is redeployed, not on every crawl, so they
// get a fixed date. Bump it when their content changes meaningfully.
const STATIC_LAST_MODIFIED = new Date('2026-10-01');

// Supabase caps a single response (1000 rows by default), so a plain select of
// every upcoming tournament silently drops rows as the dataset grows. Walk
// fixed-size pages until a short one comes back.
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

type CountryRow = { country_code: string | null; scraped_at: string | null };

/** The latest `scraped_at` per upper-case country code across all rows. */
export function latestScrapePerCountry(rows: CountryRow[]): Map<string, Date | undefined> {
  const latest = new Map<string, Date | undefined>();
  for (const row of rows) {
    if (!row.country_code) continue;
    const code = row.country_code.toUpperCase();
    const when = row.scraped_at ? new Date(row.scraped_at) : undefined;
    const current = latest.get(code);
    if (!latest.has(code) || (when && (!current || when > current))) latest.set(code, when);
  }
  return latest;
}

async function fetchUpcomingCountryRows(today: string): Promise<CountryRow[]> {
  const rows: CountryRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('country_code, scraped_at')
      .gte('date', today)
      .eq('status', 'published')
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.tourneyradar.com';
  const today = new Date().toISOString().split('T')[0];

  const staticRoutes: Omit<MetadataRoute.Sitemap[number], 'lastModified'>[] = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/tournaments`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/stats`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/dataset`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/api-docs`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/docs`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/status`, changeFrequency: 'daily', priority: 0.4 },
    { url: `${baseUrl}/updates`, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/feedback`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/support`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/legal`, changeFrequency: 'yearly', priority: 0.3 },
  ];
  const staticPages: MetadataRoute.Sitemap = staticRoutes.map((page) => ({
    ...page,
    lastModified: STATIC_LAST_MODIFIED,
  }));

  try {
    const [tournamentsResult, countryRows] = await Promise.all([
      supabase
        .from('tournaments')
        .select('id, scraped_at')
        .gte('date', today)
        .eq('status', 'published')
        .order('date', { ascending: true })
        .limit(5000),
      fetchUpcomingCountryRows(today),
    ]);

    const tournaments = tournamentsResult.data || [];

    const tournamentPages: MetadataRoute.Sitemap = tournaments.map((t) => ({
      url: `${baseUrl}/tournaments/${t.id}`,
      lastModified: t.scraped_at ? new Date(t.scraped_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // One entry per distinct country with upcoming published events, dated by
    // the most recent scrape that touched it.
    const countryPages: MetadataRoute.Sitemap = [...latestScrapePerCountry(countryRows)].map(
      ([code, lastModified]) => ({
        url: `${baseUrl}/country/${code.toLowerCase()}`,
        lastModified,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })
    );

    return [...staticPages, ...countryPages, ...tournamentPages];
  } catch (error) {
    console.error('Sitemap error:', error);
    return staticPages;
  }
}
