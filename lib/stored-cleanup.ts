// One-off clean-ups over rows already stored in `tournaments`. The scraper guards stop new bad
// rows (implausible dates, #211; country-centroid geocodes, #212), but rows saved before those
// guards stay as they were until something rewrites them. These helpers find those rows; the
// scraper's --unpublish-implausible and --regeocode-centroids flags act on them.
import type { SupabaseClient } from '@supabase/supabase-js';

import { latestPlausibleStartDate } from './dates';
import { COUNTRY_COORDINATES } from './geocoding';

/**
 * Status for rows hidden because their start date cannot be right (a typo like 2926, or a
 * Bikram Sambat year like 2083). Like DUPLICATE_STATUS, `tournaments.status` is defined in the
 * Supabase dashboard, so confirm it allows this value before the first real run.
 */
export const INVALID_DATE_STATUS = 'invalid_date';

const PAGE_SIZE = 1000;

export interface ImplausibleRow {
  id: string;
  name: string;
  date: string;
  country_code: string | null;
}

/** Published rows whose start date is past the plausibility limit used when scraping. */
export async function fetchImplausibleRows(
  client: SupabaseClient,
  today: string,
): Promise<ImplausibleRow[]> {
  const { data, error } = await client
    .from('tournaments')
    .select('id, name, date, country_code')
    .eq('status', 'published')
    .gt('date', latestPlausibleStartDate(today))
    .order('date', { ascending: true })
    .limit(PAGE_SIZE);
  if (error) throw new Error(`fetchImplausibleRows: ${error.message}`);
  return (data ?? []) as ImplausibleRow[];
}

export interface CentroidRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
}

/** Whether a row sits exactly on its country's fallback centroid, the sign of a failed geocode. */
export function isAtCountryCentroid(row: Pick<CentroidRow, 'country_code' | 'lat' | 'lng'>): boolean {
  if (!row.country_code || row.lat === null || row.lng === null) return false;
  const centroid = COUNTRY_COORDINATES[row.country_code];
  if (!centroid) return false;
  return Math.abs(row.lat - centroid.lat) < 1e-6 && Math.abs(row.lng - centroid.lng) < 1e-6;
}

/**
 * Whether a geocoder answer is really just the country. Google answers "TBD, Canada" or a
 * venue it cannot place with its own country centroid, which is a few metres off ours, so a
 * plain equality check would count it as fixed.
 */
export function isCountryLevelAnswer(countryCode: string | null, lat: number, lng: number): boolean {
  const centroid = countryCode ? COUNTRY_COORDINATES[countryCode] : undefined;
  if (!centroid) return false;
  return Math.abs(lat - centroid.lat) < 0.01 && Math.abs(lng - centroid.lng) < 0.01;
}

/** One lookup per distinct place: rows that share a city and country share a result. */
export function groupByLocation(rows: CentroidRow[]): Map<string, CentroidRow[]> {
  const groups = new Map<string, CentroidRow[]>();
  for (const row of rows) {
    const key = `${(row.city ?? '').trim().toLowerCase()}|${row.country_code ?? ''}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

/** Published upcoming rows, in a country with a centroid, that sit on that centroid. */
export async function fetchCentroidRows(
  client: SupabaseClient,
  today: string,
): Promise<CentroidRow[]> {
  const rows: CentroidRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('tournaments')
      .select('id, name, city, country, country_code, lat, lng')
      .eq('status', 'published')
      .gte('date', today)
      .in('country_code', Object.keys(COUNTRY_COORDINATES))
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`fetchCentroidRows: ${error.message}`);
    const page = (data ?? []) as CentroidRow[];
    rows.push(...page.filter(isAtCountryCentroid));
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}
