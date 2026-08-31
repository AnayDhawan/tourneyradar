// Shared export logic for the open dataset release (issue #130).
//
// Used by both scripts/export-dataset.ts (a one-off/CI file export) and
// app/api/dataset/route.ts (the live-export API, cached via unstable_cache).
// Keeping the row-shaping and format-encoding logic here means the two
// callers can never drift on what "the dataset" actually contains.
//
// Column selection: this exports `tournaments`, the current-state table
// (one row per event), not `tournament_history` (issue #125's append-only
// snapshot log). tournament_history answers "how did this listing change
// over time", which is a real research question but a different, heavier
// dataset (unbounded rows per tournament vs. one); it is left for a v2
// dataset release rather than folded into v1. See DATASET.md.
//
// Columns deliberately excluded from the export, and why:
//   - organizer_phone, organizer_email, whatsapp_group, registration_link:
//     contact details scraped for the site's own "View Details" flow, not
//     meant for bulk redistribution.
//   - location, venue_name, venue_address, description, pdf, rules,
//     amenities: either redundant with city/state/country or too
//     free-text/sparse to be a meaningful research column.
//   - source_id: an internal join key with no meaning outside this schema.
// Everything else in the public app's own display of a tournament (name,
// dates, location, category, rating info, FIDE flag, source link) is kept.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DatasetRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  date: string;
  end_date: string | null;
  category: string | null;
  fide_rated: boolean | null;
  min_rating: number | null;
  max_rating: number | null;
  time_control: string | null;
  rounds: number | null;
  format: string | null;
  organizer_name: string | null;
  source: string | null;
  source_url: string | null;
  external_link: string | null;
  status: string | null;
  scraped_at: string | null;
  created_at: string | null;
}

export const DATASET_COLUMNS: readonly (keyof DatasetRow)[] = [
  'id', 'name', 'city', 'state', 'country', 'country_code', 'lat', 'lng',
  'date', 'end_date', 'category', 'fide_rated', 'min_rating', 'max_rating',
  'time_control', 'rounds', 'format', 'organizer_name', 'source',
  'source_url', 'external_link', 'status', 'scraped_at', 'created_at',
];

const DATASET_SELECT_FIELDS = DATASET_COLUMNS.join(', ');

// Supabase/PostgREST caps a single response at 1000 rows regardless of
// `.limit()`, so a table this size needs paging via `.range()`. Matches the
// pattern scripts/scrape.ts already uses for its own existingIds select,
// just looped.
const PAGE_SIZE = 1000;

export async function fetchDatasetRows(
  client: SupabaseClient
): Promise<DatasetRow[]> {
  const rows: DatasetRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await client
      .from('tournaments')
      .select(DATASET_SELECT_FIELDS)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`fetchDatasetRows: ${error.message}`);
    const page = (data ?? []) as unknown as DatasetRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export interface DatasetMeta {
  rowCount: number;
  countryCount: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  generatedAt: string;
  columns: readonly (keyof DatasetRow)[];
}

export function buildDatasetMeta(rows: DatasetRow[]): DatasetMeta {
  const countries = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const row of rows) {
    if (row.country_code) countries.add(row.country_code);
    if (row.date) {
      if (!minDate || row.date < minDate) minDate = row.date;
      if (!maxDate || row.date > maxDate) maxDate = row.date;
    }
  }

  return {
    rowCount: rows.length,
    countryCount: countries.size,
    dateRangeStart: minDate,
    dateRangeEnd: maxDate,
    generatedAt: new Date().toISOString(),
    columns: DATASET_COLUMNS,
  };
}

// Minimal RFC 4180 quoting: wrap in double quotes and escape embedded quotes
// whenever a value contains a comma, quote, or newline. Everything else is
// written bare, matching how a spreadsheet app round-trips CSV.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(rows: DatasetRow[]): string {
  const header = DATASET_COLUMNS.join(',');
  const lines = rows.map((row) =>
    DATASET_COLUMNS.map((col) => csvCell(row[col])).join(',')
  );
  return [header, ...lines].join('\r\n') + '\r\n';
}

export function toNDJSON(rows: DatasetRow[]): string {
  return rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
}
