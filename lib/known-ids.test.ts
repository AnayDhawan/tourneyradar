import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchKnownTournaments, selectLinksToScrape, type KnownTournament } from './known-ids';

const NOW = new Date('2026-10-23T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const link = (n: number) => `https://chess-results.com/tnr${n}.aspx?lan=1`;

function known(entries: Record<string, KnownTournament>) {
  return new Map(Object.entries(entries));
}

describe('selectLinksToScrape', () => {
  it('opens ids that are not in the database', () => {
    const result = selectLinksToScrape([link(1), link(2)], known({}), NOW);
    expect(result.toScrape).toEqual([link(1), link(2)]);
    expect(result).toMatchObject({ total: 2, fresh: 2, refresh: 0, skipped: 0 });
  });

  it('skips known events whose date has passed, however old the scrape is', () => {
    const result = selectLinksToScrape(
      [link(1)],
      known({ cr_1: { date: '2026-10-01', scraped_at: daysAgo(60) } }),
      NOW
    );
    expect(result.toScrape).toEqual([]);
    expect(result.skipped).toBe(1);
  });

  it('skips known upcoming events that were scraped recently', () => {
    const result = selectLinksToScrape(
      [link(1)],
      known({ cr_1: { date: '2026-12-01', scraped_at: daysAgo(2) } }),
      NOW
    );
    expect(result.toScrape).toEqual([]);
    expect(result.skipped).toBe(1);
  });

  it('revisits known upcoming events whose scrape is older than a week', () => {
    const result = selectLinksToScrape(
      [link(1)],
      known({ cr_1: { date: '2026-12-01', scraped_at: daysAgo(8) } }),
      NOW
    );
    expect(result.toScrape).toEqual([link(1)]);
    expect(result).toMatchObject({ refresh: 1, fresh: 0, skipped: 0 });
  });

  it('revisits an upcoming event that has no scraped_at', () => {
    const result = selectLinksToScrape(
      [link(1)],
      known({ cr_1: { date: '2026-12-01', scraped_at: null } }),
      NOW
    );
    expect(result.toScrape).toEqual([link(1)]);
  });

  it('treats an event dated today as still upcoming', () => {
    const result = selectLinksToScrape(
      [link(1)],
      known({ cr_1: { date: '2026-10-23', scraped_at: daysAgo(30) } }),
      NOW
    );
    expect(result.toScrape).toEqual([link(1)]);
  });

  it('puts unseen events before refreshes, stalest refresh first', () => {
    const result = selectLinksToScrape(
      [link(1), link(2), link(3)],
      known({
        cr_1: { date: '2026-12-01', scraped_at: daysAgo(9) },
        cr_2: { date: '2026-12-01', scraped_at: daysAgo(30) },
      }),
      NOW
    );
    expect(result.toScrape).toEqual([link(3), link(2), link(1)]);
  });

  it('ignores duplicate links and links without a tournament number', () => {
    const result = selectLinksToScrape([link(1), link(1), 'https://chess-results.com/about'], known({}), NOW);
    expect(result.toScrape).toEqual([link(1)]);
    expect(result.total).toBe(1);
  });
});

describe('fetchKnownTournaments', () => {
  type Row = { id: string; date: string; scraped_at: string };

  function clientReturning(range: ReturnType<typeof vi.fn>) {
    const chain = { select: vi.fn(), like: vi.fn(), order: vi.fn(), range };
    chain.select.mockReturnValue(chain);
    chain.like.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
  }

  const row = (n: number): Row => ({ id: `cr_${n}`, date: '2026-12-01', scraped_at: daysAgo(1) });

  it('keeps paging until a short page, so more than 1000 rows are returned', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row(i));
    const range = vi.fn();
    range.mockResolvedValueOnce({ data: full, error: null });
    range.mockResolvedValueOnce({ data: [row(1000), row(1001)], error: null });

    const result = await fetchKnownTournaments(clientReturning(range));

    expect(result.size).toBe(1002);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('throws on a database error instead of returning a partial set', async () => {
    const range = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(fetchKnownTournaments(clientReturning(range))).rejects.toThrow('boom');
  });
});
