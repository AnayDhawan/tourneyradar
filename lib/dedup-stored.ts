// Duplicate detection across scrape runs (issue #214).
//
// `dedupeTournaments` only compares the rows inside the batch being pushed, so when one copy of
// an event is already stored from an earlier run, the new copy is compared with nothing and both
// stay published. This module runs the same scoring over the rows already in the table.
//
// It is pure apart from `fetchPublishedUpcoming`, which pages the published upcoming rows. The
// scraper decides what to do with the groups: print them (dry run) or unpublish the dropped
// copies. Dropped rows are never deleted.
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  findDuplicates,
  type DedupCandidate,
  type DuplicateGroup,
} from './dedup';

/** The `tournaments` columns the duplicate scoring reads. */
export interface StoredTournamentRow {
  id: string;
  name: string;
  date: string;
  end_date: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  organizer_name: string | null;
  external_link: string | null;
  lat: number | null;
  lng: number | null;
  min_rating: number | null;
  max_rating: number | null;
  time_control: string | null;
  rounds: number | null;
}

const STORED_COLUMNS =
  'id, name, date, end_date, city, country, country_code, organizer_name, external_link, lat, lng, min_rating, max_rating, time_control, rounds';

/**
 * `tournaments.status` is defined in the Supabase dashboard, not in a migration (see
 * supabase/README.md). Every public read filters on `status = 'published'`, so any other value
 * hides a row; this one says why. Confirm the dashboard allows it before the first real run.
 */
export const DUPLICATE_STATUS = 'duplicate';

/** More drops than this in one run is treated as a bad match, not a clean-up. */
export const MAX_UNPUBLISH_PER_RUN = 100;

const PAGE_SIZE = 1000;

export function rowToCandidate(row: StoredTournamentRow): DedupCandidate {
  return {
    id: row.id,
    name: row.name,
    start_date: row.date,
    end_date: row.end_date ?? row.date,
    city: row.city ?? '',
    country: row.country ?? '',
    country_code: row.country_code ?? '',
    organizer: row.organizer_name,
    external_link: row.external_link,
    lat: row.lat,
    lng: row.lng,
    min_rating: row.min_rating,
    max_rating: row.max_rating,
  };
}

/** Duplicate groups among stored rows, using the same scoring as the in-batch dedup. */
export function findStoredDuplicates(
  rows: StoredTournamentRow[],
): DuplicateGroup[] {
  return findDuplicates(rows.map(rowToCandidate));
}

const fold = (text: string | null) =>
  (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * Whether every row in a group is an exact copy: the same name, dates, city, rating limits,
 * time control and round count. The similarity score alone is not enough to unpublish on. On
 * live data, most groups it finds are separate sections of one event ("Brno Open - A IM Round
 * Robin", an under-10 and an under-12 section of one junior open) that share a name stem and a
 * date but are different tournaments. Those are reported for a person to look at, never hidden.
 */
export function isExactCopyGroup(
  group: DuplicateGroup,
  rowsById: Map<string, StoredTournamentRow>,
): boolean {
  const members = [group.keep, ...group.drop].map((member) =>
    rowsById.get(member.id),
  );
  if (members.some((member) => member === undefined)) return false;
  const [first, ...rest] = members as StoredTournamentRow[];
  return rest.every(
    (member) =>
      fold(member.name) === fold(first.name) &&
      member.date === first.date &&
      (member.end_date ?? member.date) === (first.end_date ?? first.date) &&
      fold(member.city) === fold(first.city) &&
      member.min_rating === first.min_rating &&
      member.max_rating === first.max_rating &&
      fold(member.time_control) === fold(first.time_control) &&
      member.rounds === first.rounds,
  );
}

/** Splits groups into the exact copies that are safe to unpublish and those that need a look. */
export function classifyGroups(
  groups: DuplicateGroup[],
  rows: StoredTournamentRow[],
): { exact: DuplicateGroup[]; review: DuplicateGroup[] } {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const exact: DuplicateGroup[] = [];
  const review: DuplicateGroup[] = [];
  for (const group of groups)
    (isExactCopyGroup(group, rowsById) ? exact : review).push(group);
  return { exact, review };
}

/** Ids to unpublish: every dropped copy across the given groups, each once. */
export function droppedIds(groups: DuplicateGroup[]): string[] {
  return [
    ...new Set(groups.flatMap((group) => group.drop.map((copy) => copy.id))),
  ];
}

export async function fetchPublishedUpcoming(
  client: SupabaseClient,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<StoredTournamentRow[]> {
  const rows: StoredTournamentRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('tournaments')
      .select(STORED_COLUMNS)
      .eq('status', 'published')
      .gte('date', today)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`fetchPublishedUpcoming: ${error.message}`);
    const page = (data ?? []) as unknown as StoredTournamentRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}
