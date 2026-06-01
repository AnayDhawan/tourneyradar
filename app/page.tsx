import { unstable_cache } from 'next/cache';
import HomePageClient from './HomePageClient';
import { generateOrganizationJsonLd, generateWebsiteJsonLd } from '@/app/lib/metadata';

const API_URL = 'https://tourneyradar-api.vercel.app';

const getCachedData = unstable_cache(
  async () => {
    const res = await fetch(`${API_URL}/v1/tournaments`, { next: { revalidate: 86400 } });
    if (!res.ok) return { tournaments: [], stats: { total: 0, countries: 0, mapped: 0 } };

    const { data: tournaments } = await res.json();
    const list = (tournaments || []) as Array<Record<string, unknown>>;

    const uniqueCountries = new Set(list.map((t) => t.country_code).filter(Boolean));
    const stats = {
      total: list.length,
      countries: uniqueCountries.size,
      mapped: list.filter((t) => t.lat && t.lng).length,
    };

    return { tournaments: list, stats };
  },
  ['home-data'],
  { revalidate: 86400, tags: ['tournaments'] }
);

export default async function HomePage() {
  const { tournaments, stats } = await getCachedData();

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
      <HomePageClient initialTournaments={tournaments as Parameters<typeof HomePageClient>[0]['initialTournaments']} stats={stats} />
    </>
  );
}
