import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insert, countResult, insertResult } = vi.hoisted(() => ({
  insert: vi.fn(),
  countResult: { count: 0 as number | null, error: null as { message: string } | null },
  insertResult: { error: null as { message: string } | null },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => Promise.resolve(countResult) }),
      insert: (row: unknown) => {
        insert(row);
        return Promise.resolve(insertResult);
      },
    }),
  }),
}));

// A start date a month from now, so the test does not expire.
const startDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

const body = {
  name: 'Harbour Club Rapid 2099',
  date: startDate,
  end_date: '',
  city: 'Valletta',
  country_code: 'MT',
  category: 'Rapid',
  fide_rated: false,
  organizer_name: 'Harbour Chess Club',
  organizer_email: '',
  external_link: '',
  website: '',
};

let ipCounter = 0;
function request(payload: unknown, ip = `203.0.113.${(ipCounter += 1)}`) {
  return new NextRequest('http://localhost/api/tournaments/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

beforeEach(() => {
  insert.mockReset();
  countResult.count = 0;
  countResult.error = null;
  insertResult.error = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
});

describe('POST /api/tournaments/submit', () => {
  it('stores a valid submission as a pending row and returns 201', async () => {
    const { POST } = await import('./route');

    const res = await POST(request(body));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe('pending');
    expect(json.id).toMatch(/^sub_[0-9a-f-]{36}$/);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      id: json.id,
      name: 'Harbour Club Rapid 2099',
      status: 'pending',
      source: 'submission',
      country_code: 'MT',
    });
  });

  it('never lets the client choose the status or id', async () => {
    const { POST } = await import('./route');

    await POST(request({ ...body, status: 'published', id: 'cr_1' }));

    expect(insert.mock.calls[0][0].status).toBe('pending');
    expect(insert.mock.calls[0][0].id).not.toBe('cr_1');
  });

  it('answers 400 with per-field errors and writes nothing for invalid input', async () => {
    const { POST } = await import('./route');

    const res = await POST(request({ ...body, name: '', category: 'Bughouse' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(Object.keys(json.errors).sort()).toEqual(['category', 'name']);
    expect(insert).not.toHaveBeenCalled();
  });

  it('answers 400 for a body that is not JSON', async () => {
    const { POST } = await import('./route');

    const res = await POST(request('{bad'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('pretends success but writes nothing when the honeypot is filled', async () => {
    const { POST } = await import('./route');

    const res = await POST(request({ ...body, website: 'https://spam.example' }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ status: 'received' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('limits one address to five submissions an hour', async () => {
    const { POST } = await import('./route');
    const ip = '198.51.100.99';

    const statuses = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await POST(request(body, ip))).status);

    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
    expect(insert).toHaveBeenCalledTimes(5);
  });

  it('refuses new submissions while the review queue is full', async () => {
    const { POST, MAX_PENDING } = await import('./route');
    countResult.count = MAX_PENDING;

    const res = await POST(request(body));

    expect(res.status).toBe(503);
    expect(insert).not.toHaveBeenCalled();
  });

  it('hides database errors from the caller', async () => {
    const { POST } = await import('./route');
    insertResult.error = { message: 'permission denied for table tournaments' };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(request(body));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('permission denied');
  });

  it('answers 503 when the server has no service key', async () => {
    const { POST } = await import('./route');
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(request(body));

    expect(res.status).toBe(503);
    expect(insert).not.toHaveBeenCalled();
  });
});
