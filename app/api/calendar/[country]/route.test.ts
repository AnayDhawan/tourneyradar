import { describe, expect, it, vi } from 'vitest';

const { rows } = vi.hoisted(() => ({ rows: { current: [] as unknown[] } }));

// Every query-builder method returns the builder; awaiting it yields the rows.
vi.mock('@/lib/supabase', () => {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'order', 'limit']) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data: rows.current, error: null });
  return { supabase: { from: () => builder } };
});

import { GET } from './route';

describe('GET /api/calendar/[country]', () => {
  it('escapes commas in the DESCRIPTION location, like SUMMARY and LOCATION', async () => {
    rows.current = [
      {
        id: 't1',
        name: 'Spring Open',
        date: '2027-03-14',
        end_date: null,
        city: 'Newark, Delaware',
        state: null,
        country: 'United States',
        country_code: 'US',
      },
    ];
    const res = await GET(new Request('http://localhost/api/calendar/US.ics'), {
      params: Promise.resolve({ country: 'US.ics' }),
    });
    const text = (await res.text()).replace(/\r\n /g, '');
    expect(text).toContain('LOCATION:Newark\\, Delaware\\, United States');
    expect(text).toContain('DESCRIPTION:Location: Newark\\, Delaware\\, United States');
  });

  it('answers 404 for an unknown country code', async () => {
    const res = await GET(new Request('http://localhost/api/calendar/ZZ.ics'), {
      params: Promise.resolve({ country: 'ZZ.ics' }),
    });
    expect(res.status).toBe(404);
  });
});
