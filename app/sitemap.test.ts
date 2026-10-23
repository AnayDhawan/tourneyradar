import { describe, expect, it, vi } from 'vitest';

// The sitemap imports the Supabase client, which refuses to start without credentials.
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const { latestScrapePerCountry } = await import('./sitemap');

describe('latestScrapePerCountry', () => {
  it('returns one entry per distinct country, upper-cased', () => {
    const latest = latestScrapePerCountry([
      { country_code: 'in', scraped_at: '2026-10-01T00:00:00Z' },
      { country_code: 'IN', scraped_at: '2026-10-02T00:00:00Z' },
      { country_code: 'GB', scraped_at: '2026-09-30T00:00:00Z' },
    ]);
    expect([...latest.keys()].sort()).toEqual(['GB', 'IN']);
  });

  it('uses the most recent scrape for each country', () => {
    const latest = latestScrapePerCountry([
      { country_code: 'IN', scraped_at: '2026-10-01T00:00:00Z' },
      { country_code: 'IN', scraped_at: '2026-10-05T00:00:00Z' },
      { country_code: 'IN', scraped_at: '2026-10-03T00:00:00Z' },
    ]);
    expect(latest.get('IN')?.toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });

  it('has no date for a country whose rows were never scraped, instead of pretending it changed now', () => {
    const latest = latestScrapePerCountry([{ country_code: 'FR', scraped_at: null }]);
    expect(latest.has('FR')).toBe(true);
    expect(latest.get('FR')).toBeUndefined();
  });

  it('keeps a real date when another row of the same country has none', () => {
    const latest = latestScrapePerCountry([
      { country_code: 'FR', scraped_at: null },
      { country_code: 'FR', scraped_at: '2026-10-05T00:00:00Z' },
    ]);
    expect(latest.get('FR')?.toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });

  it('skips rows with no country code', () => {
    expect(latestScrapePerCountry([{ country_code: null, scraped_at: '2026-10-05T00:00:00Z' }]).size).toBe(0);
  });

  it('counts every distinct country even past a thousand rows', () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({
      country_code: `C${i % 120}`,
      scraped_at: '2026-10-05T00:00:00Z',
    }));
    expect(latestScrapePerCountry(rows).size).toBe(120);
  });
});
