// ========== ENTITY RESOLUTION / CROSS-FEDERATION DEDUP ==========
//
// The same real-world tournament sometimes shows up on chess-results.com
// under two different `tnr` pages: one on a federation site, one on a
// regional sub-site. Both get a distinct `id` (`cr_<tnrId>`), so uniqueness
// on `id` alone never catches them and both rows get published.
//
// This module scores pairs of tournaments on name + date + location
// similarity and groups the ones that score above DUPLICATE_SCORE_THRESHOLD
// as the same event. It is pure and has no Supabase/Puppeteer dependency so
// it can be unit-tested and reused wherever a merged tournament list is
// assembled (single-region scrape, or the cross-region CI merge job).

// Minimal shape this module needs. `ScrapedTournament` in scripts/scrape.ts
// satisfies this structurally, no import needed in either direction.
export interface DedupCandidate {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  city: string;
  country: string;
  country_code: string;
  organizer?: string | null;
  external_link?: string | null;
  lat?: number | null;
  lng?: number | null;
  min_rating?: number | null;
  max_rating?: number | null;
}

export interface DuplicateGroup<T extends DedupCandidate = DedupCandidate> {
  keep: T;
  drop: T[];
  score: number;
}

export interface DedupResult<T extends DedupCandidate = DedupCandidate> {
  deduped: T[];
  mergedCount: number;
  groups: DuplicateGroup<T>[];
}

// Confidence threshold above which two tournaments are treated as the same
// event. Picked so that an exact name match with a date within a day and a
// matching country (but a differently formatted city, e.g. "Kolkata" vs
// "Kolkata, WB") still clears it, while a same-day, same-country pair with
// merely similar names does not.
export const DUPLICATE_SCORE_THRESHOLD = 0.85;

// Weights for the combined score. Name carries the most signal since dates
// and cities are the fields most likely to disagree in formatting between a
// federation page and a regional sub-site.
const WEIGHTS = {
  name: 0.5,
  date: 0.3,
  location: 0.2,
};

// ========== STRING SIMILARITY ==========

// Classic iterative Levenshtein distance (single-row DP, O(n*m) time, O(min(n,m)) space).
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Iterate over the shorter string to minimize row size.
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];

  let prevRow = Array.from({ length: short.length + 1 }, (_, i) => i);

  for (let i = 1; i <= long.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= short.length; j++) {
      const cost = long[i - 1] === short[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost // substitution
      );
    }
    prevRow = currRow;
  }

  return prevRow[short.length];
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (after NFKD decomposition)
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance normalized into a 0..1 similarity score.
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

// ========== DATE PROXIMITY ==========

function daysBetween(a: string, b: string): number | null {
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.abs(da - db) / (1000 * 60 * 60 * 24);
}

// 1 for an exact same-day match, partial credit within a day of tolerance
// (federation vs regional pages sometimes record the event's date slightly
// differently), 0 otherwise.
function dateProximityScore(a: DedupCandidate, b: DedupCandidate): number {
  const diff = daysBetween(a.start_date, b.start_date);
  if (diff === null) return 0;
  if (diff === 0) return 1;
  if (diff <= 1) return 0.6;
  return 0;
}

// ========== LOCATION SIMILARITY ==========

function normalizeCity(city: string): string {
  return normalizeText(city);
}

// High-name-similarity cutoff used to treat a city mismatch as formatting
// noise rather than a genuinely different place (see locationSimilarityScore).
const HIGH_NAME_SIMILARITY = 0.9;

// 1 when city and country_code both match. 0 whenever the country_code
// differs (it's a controlled vocabulary, city is free text, so a
// country_code mismatch is a hard signal these are different places).
// When only the country_code matches and the city differs, that's usually
// just formatting ("Kolkata" vs "Kolkata, WB") rather than a different
// city, *if* the two names are otherwise near-identical, so it gets almost
// full credit (0.9) in that case and partial credit (0.5) otherwise.
function locationSimilarityScore(a: DedupCandidate, b: DedupCandidate, nameSim: number): number {
  if (a.country_code !== b.country_code) return 0;
  if (normalizeCity(a.city) === normalizeCity(b.city)) return 1;
  return nameSim >= HIGH_NAME_SIMILARITY ? 0.9 : 0.5;
}

// ========== COMBINED SCORE ==========

export function pairScore(a: DedupCandidate, b: DedupCandidate): number {
  const name = nameSimilarity(a.name, b.name);
  const date = dateProximityScore(a, b);
  const location = locationSimilarityScore(a, b, name);
  return name * WEIGHTS.name + date * WEIGHTS.date + location * WEIGHTS.location;
}

// ========== COMPLETENESS (tie-break on which duplicate to keep) ==========

// Higher is "more complete". Geocoding and organizer/external-link/rating
// data are the fields the scraper fills in inconsistently depending on
// which page it landed on, so prefer whichever copy has more of them
// filled in. Falls back to a longer name (usually the more descriptive
// federation-page title) and finally to `id` for determinism.
function completenessScore(t: DedupCandidate): number {
  let score = 0;
  if (t.lat != null && t.lng != null) score += 2;
  if (t.organizer) score += 1;
  if (t.external_link) score += 1;
  if (t.min_rating != null || t.max_rating != null) score += 1;
  return score;
}

function pickMoreComplete<T extends DedupCandidate>(a: T, b: T): { keep: T; drop: T } {
  const sa = completenessScore(a);
  const sb = completenessScore(b);
  if (sa !== sb) return sa > sb ? { keep: a, drop: b } : { keep: b, drop: a };
  if (a.name.length !== b.name.length) {
    return a.name.length > b.name.length ? { keep: a, drop: b } : { keep: b, drop: a };
  }
  // Deterministic final tiebreak so re-running the pass is stable.
  return a.id.localeCompare(b.id) <= 0 ? { keep: a, drop: b } : { keep: b, drop: a };
}

// ========== UNION-FIND (group transitively-linked duplicates) ==========

class DisjointSet {
  private parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

// ========== PUBLIC API ==========

// Finds groups of tournaments that are almost certainly the same real-world
// event. Only compares pairs sharing a country_code (an O(n^2) scan bucketed
// by country_code, which keeps this fast even at a few thousand rows since
// most countries only contribute a handful of tournaments per run).
export function findDuplicates<T extends DedupCandidate>(tournaments: T[]): DuplicateGroup<T>[] {
  const byCountry = new Map<string, number[]>();
  tournaments.forEach((t, i) => {
    const bucket = byCountry.get(t.country_code) ?? [];
    bucket.push(i);
    byCountry.set(t.country_code, bucket);
  });

  const dsu = new DisjointSet(tournaments.length);
  const bestScoreForPair = new Map<string, number>();

  for (const indices of byCountry.values()) {
    for (let x = 0; x < indices.length; x++) {
      for (let y = x + 1; y < indices.length; y++) {
        const i = indices[x];
        const j = indices[y];
        const score = pairScore(tournaments[i], tournaments[j]);
        if (score >= DUPLICATE_SCORE_THRESHOLD) {
          dsu.union(i, j);
          bestScoreForPair.set(`${Math.min(i, j)}:${Math.max(i, j)}`, score);
        }
      }
    }
  }

  const components = new Map<number, number[]>();
  tournaments.forEach((_, i) => {
    const root = dsu.find(i);
    const list = components.get(root) ?? [];
    list.push(i);
    components.set(root, list);
  });

  const groups: DuplicateGroup<T>[] = [];
  for (const indices of components.values()) {
    if (indices.length < 2) continue;

    let keep = tournaments[indices[0]];
    const drop: T[] = [];
    for (let k = 1; k < indices.length; k++) {
      const candidate = tournaments[indices[k]];
      const resolved = pickMoreComplete(keep, candidate);
      drop.push(resolved.drop === keep ? keep : candidate);
      keep = resolved.keep;
    }

    // Representative score for logging: the highest pairwise score inside
    // this component (components can chain through intermediate matches).
    let score = 0;
    for (let x = 0; x < indices.length; x++) {
      for (let y = x + 1; y < indices.length; y++) {
        const key = `${Math.min(indices[x], indices[y])}:${Math.max(indices[x], indices[y])}`;
        const s = bestScoreForPair.get(key);
        if (s !== undefined) score = Math.max(score, s);
      }
    }

    groups.push({ keep, drop, score });
  }

  return groups;
}

// Runs findDuplicates and returns the tournament list with duplicates
// collapsed down to the most complete copy, plus a count for logging.
export function dedupeTournaments<T extends DedupCandidate>(tournaments: T[]): DedupResult<T> {
  const groups = findDuplicates(tournaments);
  if (groups.length === 0) {
    return { deduped: tournaments, mergedCount: 0, groups };
  }

  const dropIds = new Set<string>();
  for (const group of groups) {
    for (const d of group.drop) dropIds.add(d.id);
  }

  const deduped = tournaments.filter(t => !dropIds.has(t.id));
  return { deduped, mergedCount: dropIds.size, groups };
}
