// Which chess-results links the scraper still needs to open (issue #210).
//
// The scraper used to read the known ids with one unpaginated select. PostgREST caps a
// response at 1000 rows, so with 17,000 rows the "known" set was an arbitrary sample, and
// every event outside it was loaded in Puppeteer again on each run. Paging the list alone
// would flip that around and never refresh anything, so the refresh rule lives here too.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface KnownTournament {
  date: string | null;
  scraped_at: string | null;
}

export interface LinkSelection {
  /** Links to open: unseen events first, then the stalest refreshes. */
  toScrape: string[];
  /** Distinct tournament numbers among the links. */
  total: number;
  /** Known events that are skipped: already past, or scraped recently. */
  skipped: number;
  /** Known upcoming events whose last scrape is older than the refresh age. */
  refresh: number;
  /** Events that are not in the database yet. */
  fresh: number;
}

// A known event is revisited when its last scrape is older than this, so a date or venue
// change on chess-results reaches the database within about a week.
export const REFRESH_AFTER_DAYS = 7;

const PAGE_SIZE = 1000;

export async function fetchKnownTournaments(client: SupabaseClient): Promise<Map<string, KnownTournament>> {
  const known = new Map<string, KnownTournament>();

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('tournaments')
      .select('id, date, scraped_at')
      .like('id', 'cr_%')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    // Failing loudly beats carrying on with a partial set, which would re-scrape the rest.
    if (error) throw new Error(`fetchKnownTournaments: ${error.message}`);
    const page = (data ?? []) as unknown as { id: string; date: string | null; scraped_at: string | null }[];
    for (const row of page) known.set(row.id, { date: row.date, scraped_at: row.scraped_at });

    if (page.length < PAGE_SIZE) break;
  }

  return known;
}

function needsRefresh(row: KnownTournament, today: string, cutoffMs: number): boolean {
  // Past events never come back: the scraper drops them, so opening them is wasted work.
  if (row.date && row.date.slice(0, 10) < today) return false;
  if (!row.scraped_at) return true;
  const scrapedAt = Date.parse(row.scraped_at);
  return Number.isNaN(scrapedAt) || scrapedAt < cutoffMs;
}

export function selectLinksToScrape(
  links: string[],
  known: Map<string, KnownTournament>,
  now: Date = new Date()
): LinkSelection {
  const today = now.toISOString().slice(0, 10);
  const cutoffMs = now.getTime() - REFRESH_AFTER_DAYS * 24 * 60 * 60 * 1000;

  const seen = new Set<string>();
  const unseen: string[] = [];
  const refreshes: { link: string; scrapedAt: number }[] = [];
  let skipped = 0;

  for (const link of links) {
    const match = link.match(/tnr(\d+)/);
    if (!match || seen.has(match[1])) continue;
    seen.add(match[1]);

    const row = known.get(`cr_${match[1]}`);
    if (!row) {
      unseen.push(link);
    } else if (needsRefresh(row, today, cutoffMs)) {
      refreshes.push({ link, scrapedAt: row.scraped_at ? Date.parse(row.scraped_at) || 0 : 0 });
    } else {
      skipped++;
    }
  }

  refreshes.sort((a, b) => a.scrapedAt - b.scrapedAt);

  return {
    toScrape: [...unseen, ...refreshes.map((r) => r.link)],
    total: seen.size,
    skipped,
    refresh: refreshes.length,
    fresh: unseen.length,
  };
}
