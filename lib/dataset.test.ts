import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { fetchDatasetRows } from './dataset';

describe('fetchDatasetRows', () => {
  it('reads only published rows, so the export never shows more than the site', async () => {
    const range = vi.fn().mockResolvedValue({ data: [], error: null });
    const chain: Record<string, unknown> = { range };
    for (const method of ['select', 'eq', 'order']) chain[method] = vi.fn(() => chain);
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient;

    await fetchDatasetRows(client);

    expect(client.from).toHaveBeenCalledWith('tournaments');
    expect(chain.eq).toHaveBeenCalledWith('status', 'published');
  });

  it('throws on a database error instead of returning a partial export', async () => {
    const range = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const chain: Record<string, unknown> = { range };
    for (const method of ['select', 'eq', 'order']) chain[method] = vi.fn(() => chain);
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient;

    await expect(fetchDatasetRows(client)).rejects.toThrow('fetchDatasetRows: boom');
  });
});
