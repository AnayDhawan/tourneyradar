import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  MAX_UNPUBLISH_PER_RUN,
  classifyGroups,
  droppedIds,
  fetchPublishedUpcoming,
  findStoredDuplicates,
  rowToCandidate,
  type StoredTournamentRow,
} from './dedup-stored';

function row(
  overrides: Partial<StoredTournamentRow> & { id: string },
): StoredTournamentRow {
  return {
    name: 'Mississauga Open 2026',
    date: '2026-10-24',
    end_date: '2026-10-25',
    city: 'Mississauga',
    country: 'Canada',
    country_code: 'CA',
    organizer_name: null,
    external_link: null,
    lat: null,
    lng: null,
    min_rating: null,
    max_rating: null,
    time_control: '90+30',
    rounds: 7,
    ...overrides,
  };
}

describe('rowToCandidate', () => {
  it('maps date to start_date and organizer_name to organizer', () => {
    const candidate = rowToCandidate(
      row({ id: 'cr_1', organizer_name: 'Ontario Chess' }),
    );

    expect(candidate).toMatchObject({
      id: 'cr_1',
      start_date: '2026-10-24',
      end_date: '2026-10-25',
      organizer: 'Ontario Chess',
    });
  });

  it('falls back to the start date and empty strings for missing columns', () => {
    const candidate = rowToCandidate(
      row({
        id: 'cr_2',
        end_date: null,
        city: null,
        country: null,
        country_code: null,
      }),
    );

    expect(candidate.end_date).toBe('2026-10-24');
    expect(candidate.city).toBe('');
    expect(candidate.country_code).toBe('');
  });
});

describe('findStoredDuplicates', () => {
  it('groups two stored copies of one event, as in the Mississauga example', () => {
    const groups = findStoredDuplicates([
      row({ id: 'cr_1509537' }),
      row({ id: 'cr_1470565' }),
      row({ id: 'cr_9', name: 'Toronto Blitz', city: 'Toronto' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(
      [groups[0].keep.id, ...groups[0].drop.map((d) => d.id)].sort(),
    ).toEqual(['cr_1470565', 'cr_1509537']);
    expect(groups[0].score).toBeGreaterThanOrEqual(0.85);
  });

  it('does not group the same name in different countries', () => {
    expect(
      findStoredDuplicates([
        row({ id: 'cr_1' }),
        row({ id: 'cr_2', country_code: 'US', country: 'USA' }),
      ]),
    ).toEqual([]);
  });

  it('is idempotent: after the dropped copies are unpublished, a second pass finds nothing', () => {
    const rows = [
      row({ id: 'cr_1' }),
      row({ id: 'cr_2' }),
      row({ id: 'cr_3', name: 'Other Cup' }),
    ];
    const dropped = new Set(droppedIds(findStoredDuplicates(rows)));
    expect(dropped.size).toBe(1);

    const remaining = rows.filter((r) => !dropped.has(r.id));

    expect(findStoredDuplicates(remaining)).toEqual([]);
  });
});

describe('classifyGroups', () => {
  it('treats rows that match on every field as exact copies', () => {
    const rows = [row({ id: 'cr_1' }), row({ id: 'cr_2' })];

    const { exact, review } = classifyGroups(findStoredDuplicates(rows), rows);

    expect(exact).toHaveLength(1);
    expect(review).toEqual([]);
  });

  it('leaves similar sections of one event for review, not for unpublishing', () => {
    const rows = [
      row({
        id: 'cr_1',
        name: 'Hampshire Junior Open 2026 U10',
        max_rating: 1200,
      }),
      row({
        id: 'cr_2',
        name: 'Hampshire Junior Open 2026 U12',
        max_rating: 1400,
      }),
    ];
    const groups = findStoredDuplicates(rows);
    expect(groups).toHaveLength(1);

    const { exact, review } = classifyGroups(groups, rows);

    expect(exact).toEqual([]);
    expect(review).toHaveLength(1);
    expect(droppedIds(exact)).toEqual([]);
  });

  it.each([
    ['a different time control', { time_control: '15+10' }],
    ['a different round count', { rounds: 5 }],
    ['a different end date', { end_date: '2026-10-26' }],
    ['a different city', { city: 'Brampton' }],
    ['different rating limits', { min_rating: 1500 }],
  ])('does not treat rows with %s as exact copies', (_label, override) => {
    const rows = [row({ id: 'cr_1' }), row({ id: 'cr_2', ...override })];
    const groups = findStoredDuplicates(rows);

    expect(classifyGroups(groups, rows).exact).toEqual([]);
  });

  it('ignores case, accents and punctuation when comparing names and cities', () => {
    const rows = [
      row({
        id: 'cr_1',
        name: 'Open des Vendanges de Libourne',
        city: 'LIBOURNE',
      }),
      row({
        id: 'cr_2',
        name: 'OPEN DES VENDANGES DE LIBOURNE!',
        city: 'Libourné',
      }),
    ];

    expect(classifyGroups(findStoredDuplicates(rows), rows).exact).toHaveLength(
      1,
    );
  });
});

describe('droppedIds', () => {
  it('lists each dropped copy once, across groups, and never the kept row', () => {
    const rows = [
      row({ id: 'a1' }),
      row({ id: 'a2' }),
      row({ id: 'a3' }),
      row({
        id: 'b1',
        name: 'Pune Rapid',
        city: 'Pune',
        country_code: 'IN',
        country: 'India',
      }),
      row({
        id: 'b2',
        name: 'Pune Rapid',
        city: 'Pune',
        country_code: 'IN',
        country: 'India',
      }),
    ];
    const groups = findStoredDuplicates(rows);
    const ids = droppedIds(groups);

    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    for (const group of groups) expect(ids).not.toContain(group.keep.id);
  });

  it('exposes a sane per-run safety limit', () => {
    expect(MAX_UNPUBLISH_PER_RUN).toBeGreaterThan(0);
  });
});

describe('fetchPublishedUpcoming', () => {
  function clientReturning(range: ReturnType<typeof vi.fn>) {
    const chain: Record<string, unknown> = { range };
    for (const method of ['select', 'eq', 'gte', 'order'])
      chain[method] = vi.fn(() => chain);
    return {
      client: { from: vi.fn(() => chain) } as unknown as SupabaseClient,
      chain,
    };
  }

  it('pages until a short page and filters on published, upcoming rows', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row({ id: `cr_${i}` }));
    const range = vi.fn();
    range.mockResolvedValueOnce({ data: full, error: null });
    range.mockResolvedValueOnce({
      data: [row({ id: 'cr_last' })],
      error: null,
    });
    const { client, chain } = clientReturning(range);

    const rows = await fetchPublishedUpcoming(client, '2026-10-23');

    expect(rows).toHaveLength(1001);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(chain.eq).toHaveBeenCalledWith('status', 'published');
    expect(chain.gte).toHaveBeenCalledWith('date', '2026-10-23');
  });

  it('throws on a database error instead of comparing a partial set', async () => {
    const range = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { client } = clientReturning(range);

    await expect(fetchPublishedUpcoming(client)).rejects.toThrow('boom');
  });
});
