import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
type Filter = { column: string; op: 'eq' | 'is'; value: unknown };

// A small in-memory stand-in for the supabase query builder, enough for the
// select / update / eq / is / maybeSingle / select-after-update chains that
// decideSubmission uses.
class FakeDb {
  tables: Record<string, Row[]> = {};
  failUpdateOn: string | null = null;

  from(table: string) {
    const rows = (this.tables[table] ??= []);
    const filters: Filter[] = [];
    let patch: Row | null = null;
    const db = this;
    const match = () =>
      rows.filter((r) => filters.every((f) => (f.op === 'is' ? (r[f.column] ?? null) === f.value : r[f.column] === f.value)));
    const run = (): { data: Row[] | null; error: { message: string } | null } => {
      if (patch) {
        if (db.failUpdateOn === table) return { data: null, error: { message: 'boom' } };
        const hit = match();
        for (const r of hit) Object.assign(r, patch);
        return { data: hit.map((r) => ({ id: r.id })), error: null };
      }
      return { data: match(), error: null };
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      update: (p: Row) => {
        patch = p;
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push({ column, op: 'eq', value });
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push({ column, op: 'is', value });
        return builder;
      },
      maybeSingle: async () => {
        const { data, error } = run();
        return { data: data?.[0] ?? null, error };
      },
      then: (resolve: (v: unknown) => unknown) => resolve(run()),
    };
    return builder;
  }
}

const { db, geocodeSingleCity } = vi.hoisted(() => ({
  db: { current: null as unknown as FakeDb },
  geocodeSingleCity: vi.fn(),
}));
vi.mock('@/lib/supabase-server', () => ({ serviceRoleClient: () => db.current }));
vi.mock('@/lib/geocoding', () => ({ geocodeSingleCity }));

import { decideSubmission } from './moderation-server';

const NOW = new Date('2026-11-26T10:00:00Z');
const ID = 'submitted_1';

function seed(overrides: Row = {}, link: Row = {}) {
  db.current = new FakeDb();
  db.current.tables.tournaments = [
    {
      id: ID,
      name: 'Pune Club Rapid',
      date: '2026-12-20',
      end_date: '2026-12-21',
      city: 'Pune',
      country: 'India',
      country_code: 'IN',
      category: 'Rapid',
      fide_rated: false,
      external_link: 'https://example.org/pune',
      status: 'pending',
      source: 'organizer-submission',
      ...overrides,
    },
  ];
  db.current.tables.tournament_submissions = [{ id: 'link-1', tournament_id: ID, reviewed_at: null, ...link }];
}

const tournament = () => db.current.tables.tournaments[0];
const audit = () => db.current.tables.tournament_submissions[0];
const approve = { action: 'approve', note: null, edits: null, coordinates: null } as const;

beforeEach(() => {
  geocodeSingleCity.mockReset();
  geocodeSingleCity.mockResolvedValue({ lat: 18.52, lng: 73.85 });
  seed();
});

describe('decideSubmission', () => {
  it('approves: publishes, places the event and records who and when', async () => {
    const result = await decideSubmission(ID, approve, 'admin-1', NOW);

    expect(result).toEqual({ ok: true, id: ID, status: 'published' });
    expect(tournament()).toMatchObject({ status: 'published', lat: 18.52, lng: 73.85, scraped_at: NOW.toISOString() });
    expect(audit()).toMatchObject({
      decision: 'approved',
      reviewed_by: 'admin-1',
      review_source: 'dashboard',
      reviewed_at: NOW.toISOString(),
    });
  });

  it('rejects: only the status changes, and the reason is kept', async () => {
    const result = await decideSubmission(ID, { action: 'reject', reason: 'Duplicate' }, 'admin-1', NOW);

    expect(result).toEqual({ ok: true, id: ID, status: 'rejected' });
    expect(tournament()).toMatchObject({ status: 'rejected', name: 'Pune Club Rapid' });
    expect(tournament()).not.toHaveProperty('lat');
    expect(audit()).toMatchObject({ decision: 'rejected', reviewed_by: 'admin-1', review_note: 'Duplicate' });
    expect(geocodeSingleCity).not.toHaveBeenCalled();
  });

  it('edit-then-approve publishes the edited fields', async () => {
    const result = await decideSubmission(
      ID,
      { ...approve, edits: { name: 'Pune Rapid Open', city: 'Mumbai' } },
      'admin-1',
      NOW
    );

    expect(result).toMatchObject({ ok: true });
    expect(tournament()).toMatchObject({ name: 'Pune Rapid Open', city: 'Mumbai', status: 'published' });
    expect(geocodeSingleCity).toHaveBeenCalledWith('Mumbai', 'India');
  });

  it('uses the moderator coordinates instead of geocoding', async () => {
    await decideSubmission(ID, { ...approve, coordinates: { lat: 1, lng: 2 } }, 'admin-1', NOW);

    expect(geocodeSingleCity).not.toHaveBeenCalled();
    expect(tournament()).toMatchObject({ lat: 1, lng: 2 });
  });

  it('writes nothing when an edit is invalid', async () => {
    const result = await decideSubmission(ID, { ...approve, edits: { external_link: 'ftp://x' } }, 'admin-1', NOW);

    expect(result).toMatchObject({ ok: false, kind: 'invalid' });
    expect(tournament().status).toBe('pending');
    expect(audit().reviewed_at).toBeNull();
  });

  it('writes nothing when the place cannot be found', async () => {
    geocodeSingleCity.mockResolvedValue(null);
    const result = await decideSubmission(ID, approve, 'admin-1', NOW);

    expect(result).toMatchObject({ ok: false, kind: 'invalid' });
    expect(tournament().status).toBe('pending');
    expect(audit().reviewed_at).toBeNull();
  });

  it.each(['published', 'rejected'])('will not decide a submission that is already %s', async (status) => {
    seed({ status }, { reviewed_at: '2026-11-01T00:00:00Z', decision: 'approved', reviewed_by: 'earlier' });
    const result = await decideSubmission(ID, { action: 'reject', reason: 'late' }, 'admin-2', NOW);

    expect(result).toMatchObject({ ok: false, kind: 'conflict' });
    expect(tournament().status).toBe(status);
    expect(audit()).toMatchObject({ decision: 'approved', reviewed_by: 'earlier' });
  });

  it('loses the race cleanly when another moderator claimed the review first', async () => {
    seed({}, { reviewed_at: '2026-11-26T09:59:00Z', decision: 'approved', reviewed_by: 'admin-1' });
    const result = await decideSubmission(ID, { action: 'reject', reason: 'no' }, 'admin-2', NOW);

    expect(result).toMatchObject({ ok: false, kind: 'conflict' });
    expect(tournament().status).toBe('pending');
    expect(audit().reviewed_by).toBe('admin-1');
  });

  it('treats a scraped tournament as not found and leaves it alone', async () => {
    seed({ source: 'chess-results', status: 'pending' });
    const result = await decideSubmission(ID, approve, 'admin-1', NOW);

    expect(result).toMatchObject({ ok: false, kind: 'not_found' });
    expect(tournament().status).toBe('pending');
  });

  it('reports an unknown id as not found', async () => {
    expect(await decideSubmission('submitted_missing', approve, 'admin-1', NOW)).toMatchObject({
      ok: false,
      kind: 'not_found',
    });
  });

  it('releases the audit claim when the tournament update fails', async () => {
    db.current.failUpdateOn = 'tournaments';
    await expect(decideSubmission(ID, approve, 'admin-1', NOW)).rejects.toThrow();

    expect(tournament().status).toBe('pending');
    expect(audit()).toMatchObject({ reviewed_at: null, decision: null, reviewed_by: null });
  });
});
