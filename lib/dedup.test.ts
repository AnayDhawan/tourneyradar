import { describe, expect, it } from 'vitest';
import {
  DUPLICATE_SCORE_THRESHOLD,
  dedupeTournaments,
  findDuplicates,
  levenshtein,
  nameSimilarity,
  pairScore,
  type DedupCandidate,
} from './dedup';

function tournament(overrides: Partial<DedupCandidate> & { id: string }): DedupCandidate {
  return {
    name: 'Kolkata Open 2026',
    start_date: '2026-11-10',
    end_date: '2026-11-15',
    city: 'Kolkata',
    country: 'India',
    country_code: 'IN',
    ...overrides,
  };
}

describe('levenshtein and nameSimilarity', () => {
  it('counts single-character edits', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
  });

  it('ignores case, punctuation and accents', () => {
    expect(nameSimilarity('Café Open, 2026!', 'cafe open 2026')).toBe(1);
  });

  it('is low for unrelated names', () => {
    expect(nameSimilarity('Kolkata Open', 'Mumbai Blitz Cup')).toBeLessThan(0.5);
  });
});

describe('findDuplicates: pairs that should merge', () => {
  it('merges the same event listed by two sources, keeping the one with more data', () => {
    const federation = tournament({ id: 'cr_1', lat: 22.57, lng: 88.36, organizer: 'WBCA', external_link: 'https://x' });
    const regional = tournament({ id: 'cr_2' });
    const [group] = findDuplicates([regional, federation]);
    expect(group.keep.id).toBe('cr_1');
    expect(group.drop.map((t) => t.id)).toEqual(['cr_2']);
    expect(group.score).toBeGreaterThanOrEqual(DUPLICATE_SCORE_THRESHOLD);
  });

  it('merges near-identical names that differ only in punctuation or case', () => {
    const a = tournament({ id: 'a', name: 'Kolkata Open 2026' });
    const b = tournament({ id: 'b', name: 'KOLKATA OPEN - 2026' });
    expect(findDuplicates([a, b])).toHaveLength(1);
  });

  it('merges when the start dates differ by one day', () => {
    const a = tournament({ id: 'a' });
    const b = tournament({ id: 'b', start_date: '2026-11-11' });
    expect(pairScore(a, b)).toBeGreaterThanOrEqual(DUPLICATE_SCORE_THRESHOLD);
    expect(findDuplicates([a, b])).toHaveLength(1);
  });

  it('merges when only the city is formatted differently ("Kolkata" vs "Kolkata, WB")', () => {
    const a = tournament({ id: 'a', city: 'Kolkata' });
    const b = tournament({ id: 'b', city: 'Kolkata, WB' });
    expect(findDuplicates([a, b])).toHaveLength(1);
  });

  it('groups three listings of one event into a single group', () => {
    const groups = findDuplicates([tournament({ id: 'a' }), tournament({ id: 'b' }), tournament({ id: 'c' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].drop).toHaveLength(2);
  });
});

describe('findDuplicates: pairs that must NOT merge', () => {
  it('keeps the same name on different dates apart', () => {
    const a = tournament({ id: 'a', start_date: '2026-11-10' });
    const b = tournament({ id: 'b', start_date: '2026-12-10' });
    expect(findDuplicates([a, b])).toEqual([]);
  });

  it('keeps similar names in the same city and week apart', () => {
    const a = tournament({ id: 'a', name: 'Kolkata Open 2026' });
    const b = tournament({ id: 'b', name: 'Kolkata Rapid Championship' });
    expect(findDuplicates([a, b])).toEqual([]);
  });

  it('never compares across countries, even with an identical name and date', () => {
    const a = tournament({ id: 'a', country_code: 'IN' });
    const b = tournament({ id: 'b', country_code: 'GB', country: 'England', city: 'London' });
    expect(pairScore(a, b)).toBeLessThan(DUPLICATE_SCORE_THRESHOLD);
    expect(findDuplicates([a, b])).toEqual([]);
  });

  it('keeps events with the same name but a different, unrelated city apart when the name is only similar', () => {
    const a = tournament({ id: 'a', name: 'City Open', city: 'Pune' });
    const b = tournament({ id: 'b', name: 'City Classic', city: 'Delhi' });
    expect(findDuplicates([a, b])).toEqual([]);
  });

  it('does not merge when a start date cannot be read', () => {
    const a = tournament({ id: 'a' });
    const b = tournament({ id: 'b', start_date: 'not-a-date' });
    expect(findDuplicates([a, b])).toEqual([]);
  });
});

describe('which duplicate survives', () => {
  it('prefers coordinates, then organizer, link and rating data', () => {
    const bare = tournament({ id: 'bare' });
    const geocoded = tournament({ id: 'geo', lat: 1, lng: 2 });
    expect(findDuplicates([bare, geocoded])[0].keep.id).toBe('geo');
  });

  it('falls back to the longer name, then the id, so re-running is stable', () => {
    const short = tournament({ id: 'z', name: 'Kolkata Open 2026' });
    const long = tournament({ id: 'a', name: 'Kolkata Open 2026 ' + 'x' });
    expect(pairScore(short, long)).toBeGreaterThanOrEqual(DUPLICATE_SCORE_THRESHOLD);
    expect(findDuplicates([short, long])[0].keep.id).toBe('a');
    const first = findDuplicates([tournament({ id: 'a' }), tournament({ id: 'b' })])[0].keep.id;
    const second = findDuplicates([tournament({ id: 'b' }), tournament({ id: 'a' })])[0].keep.id;
    expect(first).toBe('a');
    expect(second).toBe('a');
  });
});

describe('dedupeTournaments', () => {
  it('drops the duplicates and reports how many were merged', () => {
    const input = [
      tournament({ id: 'a' }),
      tournament({ id: 'b' }),
      tournament({ id: 'other', name: 'Mumbai Blitz Cup', city: 'Mumbai' }),
    ];
    const result = dedupeTournaments(input);
    expect(result.mergedCount).toBe(1);
    expect(result.deduped.map((t) => t.id).sort()).toEqual(['a', 'other']);
  });

  it('returns the same list when nothing is a duplicate', () => {
    const input = [tournament({ id: 'a' }), tournament({ id: 'b', name: 'Mumbai Blitz Cup', city: 'Mumbai' })];
    const result = dedupeTournaments(input);
    expect(result.mergedCount).toBe(0);
    expect(result.deduped).toBe(input);
    expect(result.groups).toEqual([]);
  });

  it('handles an empty list', () => {
    expect(dedupeTournaments([])).toEqual({ deduped: [], mergedCount: 0, groups: [] });
  });
});
