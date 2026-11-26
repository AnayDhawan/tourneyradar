import { beforeEach, describe, expect, it, vi } from 'vitest';

type Call = { table: string; ops: Array<[string, unknown[]]> };
const { calls, results } = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; ops: Array<[string, unknown[]]> }>,
  results: { queue: [] as Array<{ data: unknown; error: { code: string } | null }> },
}));

// A chainable stand-in for the supabase-js query builder: records every call,
// and awaiting it (or maybeSingle) yields the next queued result.
vi.mock('@/lib/supabase-server', () => ({
  serviceRoleClient: () => ({
    from: (table: string) => {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const builder: Record<string, unknown> = {};
      const next = () => results.queue.shift() ?? { data: null, error: null };
      for (const m of ['select', 'eq', 'in', 'or', 'order', 'limit', 'upsert', 'update', 'insert']) {
        builder[m] = (...args: unknown[]) => {
          call.ops.push([m, args]);
          return builder;
        };
      }
      builder.maybeSingle = () => Promise.resolve(next());
      builder.then = (resolve: (v: unknown) => unknown) => resolve(next());
      return builder;
    },
  }),
}));

import { generateFeedToken } from './calendar-feed';
import {
  ensureFeedToken,
  findPlayerIdByFeedToken,
  listFeedTournaments,
  rotateFeedToken,
} from './calendar-feed-server';

beforeEach(() => {
  calls.length = 0;
  results.queue = [];
});

const opsOf = (i: number, name: string) => calls[i].ops.filter(([n]) => n === name);

describe('findPlayerIdByFeedToken', () => {
  it('resolves a matching token to its player', async () => {
    const token = generateFeedToken();
    results.queue.push({ data: { player_id: 'p1', token }, error: null });
    expect(await findPlayerIdByFeedToken(token)).toBe('p1');
    expect(opsOf(0, 'eq')[0][1]).toEqual(['token', token]);
  });

  it('returns null for an unknown token', async () => {
    results.queue.push({ data: null, error: null });
    expect(await findPlayerIdByFeedToken(generateFeedToken())).toBeNull();
  });

  it('returns null without a query for a malformed token', async () => {
    expect(await findPlayerIdByFeedToken("' or 1=1 --")).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('rejects a row whose token differs, even if the database returned it', async () => {
    results.queue.push({ data: { player_id: 'p1', token: generateFeedToken() }, error: null });
    expect(await findPlayerIdByFeedToken(generateFeedToken())).toBeNull();
  });

  it('throws an error that names the step and code but not the token', async () => {
    const token = generateFeedToken();
    results.queue.push({ data: null, error: { code: '57014' } });
    await expect(findPlayerIdByFeedToken(token)).rejects.toThrow(/lookup failed \(57014\)$/);
    results.queue.push({ data: null, error: { code: '57014' } });
    await findPlayerIdByFeedToken(token).catch((e: Error) => expect(e.message).not.toContain(token));
  });
});

describe('ensureFeedToken and rotateFeedToken', () => {
  it('ensure ignores a conflict so an existing token survives, then reads it back', async () => {
    const existing = generateFeedToken();
    results.queue.push({ data: null, error: null }, { data: { token: existing }, error: null });
    expect(await ensureFeedToken('p1')).toBe(existing);
    const [, args] = opsOf(0, 'upsert')[0];
    expect(args[1]).toEqual({ onConflict: 'player_id', ignoreDuplicates: true });
  });

  it('rotate writes a fresh token over the same row and returns it', async () => {
    results.queue.push({ data: [{ player_id: 'p1' }], error: null });
    const token = await rotateFeedToken('p1');
    const update = opsOf(0, 'update')[0][1][0] as { token: string; rotated_at: string };
    expect(update.token).toBe(token);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(opsOf(0, 'eq')[0][1]).toEqual(['player_id', 'p1']);
  });

  it('rotate never returns the previous token', async () => {
    results.queue.push({ data: [{ player_id: 'p1' }], error: null }, { data: [{ player_id: 'p1' }], error: null });
    expect(await rotateFeedToken('p1')).not.toBe(await rotateFeedToken('p1'));
  });

  it('rotate with no row yet creates one', async () => {
    results.queue.push({ data: [], error: null }, { data: null, error: null });
    await rotateFeedToken('p1');
    expect(calls[1].ops.some(([n]) => n === 'insert')).toBe(true);
  });
});

describe('listFeedTournaments', () => {
  it('returns nothing, without a second query, for an empty wishlist', async () => {
    results.queue.push({ data: [], error: null });
    expect(await listFeedTournaments('p1', '2026-11-26')).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('asks only for published tournaments among the saved ids that are not over', async () => {
    results.queue.push({ data: [{ tournament_id: 'a' }, { tournament_id: 'b' }], error: null }, { data: [{ id: 'a' }], error: null });
    const rows = await listFeedTournaments('p1', '2026-11-26');

    expect(rows).toEqual([{ id: 'a' }]);
    expect(calls[0].table).toBe('player_favorite_tournaments');
    expect(opsOf(0, 'eq')[0][1]).toEqual(['player_id', 'p1']);
    expect(calls[1].table).toBe('tournaments');
    expect(opsOf(1, 'in')[0][1]).toEqual(['id', ['a', 'b']]);
    expect(opsOf(1, 'eq')[0][1]).toEqual(['status', 'published']);
    expect(opsOf(1, 'or')[0][1]).toEqual(['date.gte.2026-11-26,end_date.gte.2026-11-26']);
  });
});
