import { countryCodeToName } from './countryMap';

// Organizer self-submission (issue #238). Pure validation and row shaping, so
// the route stays thin and this can be tested without a database.

export const CATEGORIES = ['Classical', 'Rapid', 'Blitz'] as const;
export type SubmissionCategory = (typeof CATEGORIES)[number];

// Spam guard. Submitting needs a signed-in player (the first write path into
// `tournaments` that is not the scraper), and each player is capped.
export const MAX_SUBMISSIONS_PER_DAY = 3;
export const MAX_PENDING_PER_PLAYER = 10;

const MAX_DAYS_AHEAD = 730;
const MAX_EVENT_DAYS = 60;

export interface SubmissionInput {
  name?: unknown;
  date?: unknown;
  end_date?: unknown;
  city?: unknown;
  country_code?: unknown;
  category?: unknown;
  fide_rated?: unknown;
  external_link?: unknown;
}

export interface ValidSubmission {
  name: string;
  date: string;
  end_date: string;
  city: string;
  country: string;
  country_code: string;
  category: SubmissionCategory;
  fide_rated: boolean;
  external_link: string;
}

export type ValidationResult =
  | { ok: true; value: ValidSubmission }
  | { ok: false; errors: Record<string, string> };

// Control characters and zero-width characters have no place in a listing and
// are the usual way to make two different strings look the same.
const INVISIBLE = new RegExp('[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060\ufeff]', 'g');

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim();
}

function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  // Rejects 2026-02-31, which Date would roll into March.
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

function cleanLink(value: unknown): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length > 500) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes('.')) return null;
  return url.toString();
}

export function validateSubmission(input: SubmissionInput, now: Date = new Date()): ValidationResult {
  const errors: Record<string, string> = {};

  const name = cleanText(input.name);
  if (name.length < 3 || name.length > 120) errors.name = 'Enter the tournament name (3 to 120 characters)';

  const city = cleanText(input.city);
  if (city.length < 2 || city.length > 100) errors.city = 'Enter the city (2 to 100 characters)';

  const code = typeof input.country_code === 'string' ? input.country_code.trim().toUpperCase() : '';
  const country = countryCodeToName(code);
  if (!country || code.length !== 2) errors.country_code = 'Choose a country from the list';

  const category = CATEGORIES.find((c) => c === input.category);
  if (!category) errors.category = 'Choose Classical, Rapid or Blitz';

  if (typeof input.fide_rated !== 'boolean') errors.fide_rated = 'Say whether the tournament is FIDE rated';

  const link = cleanLink(input.external_link);
  if (!link) errors.external_link = 'Enter a link to the tournament page, starting with https://';

  // Today in UTC, less a day: a date that is already "today" somewhere east of
  // UTC must still be accepted.
  const earliest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const latest = new Date(earliest.getTime() + (MAX_DAYS_AHEAD + 1) * 86_400_000);
  const start = parseDay(input.date);
  if (!start) {
    errors.date = 'Enter the start date';
  } else if (start < earliest) {
    errors.date = 'The start date is in the past';
  } else if (start > latest) {
    errors.date = 'The start date is more than two years away';
  }

  let end = start;
  const hasEnd = input.end_date !== undefined && input.end_date !== null && input.end_date !== '';
  if (hasEnd) {
    end = parseDay(input.end_date);
    if (!end) {
      errors.end_date = 'Enter a valid end date or leave it empty';
    } else if (start && end < start) {
      errors.end_date = 'The end date is before the start date';
    } else if (start && end.getTime() - start.getTime() > MAX_EVENT_DAYS * 86_400_000) {
      errors.end_date = `An event can run for at most ${MAX_EVENT_DAYS} days`;
    }
  }

  if (Object.keys(errors).length > 0 || !start || !end || !category || !country || !link) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      city,
      country,
      country_code: code,
      category,
      fide_rated: input.fide_rated === true,
      external_link: link,
    },
  };
}

/**
 * The `tournaments` row for a submission. Same columns the scraper writes, so
 * nothing downstream meets a shape it has not seen. `status` is 'pending', which
 * the published-only read policy hides from everyone but the service role until
 * a moderator publishes it (scripts/review-submissions.ts).
 */
export function submissionToRow(id: string, s: ValidSubmission) {
  return {
    id,
    name: s.name,
    date: s.date,
    end_date: s.end_date,
    location: s.city,
    city: s.city,
    state: s.country,
    country: s.country,
    country_code: s.country_code,
    time_control: null,
    rounds: null,
    organizer_name: null,
    source: 'organizer-submission',
    source_url: null,
    external_link: s.external_link,
    lat: null,
    lng: null,
    status: 'pending',
    category: s.category,
    format: null,
    fide_rated: s.fide_rated,
    min_rating: null,
    max_rating: null,
    scraped_at: null,
  };
}
