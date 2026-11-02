// Organizer self-submissions for tournaments that are not on Chess-Results.com (issue #238).
//
// A submission becomes a `tournaments` row with `status = 'pending'`. Every public read already
// filters on `status = 'published'`, so a pending row is invisible until a person flips it. This
// module is the validation half: pure, no Supabase, so it can be unit-tested and reused by the form.
import { countryCodeToName, listCountries } from './countryMap';
import { isPlausibleStartDate } from './dates';

export const SUBMISSION_CATEGORIES = ['Classical', 'Rapid', 'Blitz'] as const;
export type SubmissionCategory = (typeof SUBMISSION_CATEGORIES)[number];

/** The only status a submission is ever written with. */
export const PENDING_STATUS = 'pending';

/** How long an event may run, so a typo in the end date cannot create a year-long event. */
const MAX_EVENT_DAYS = 31;

export interface SubmissionRow {
  name: string;
  date: string;
  end_date: string;
  city: string;
  country: string;
  country_code: string;
  category: SubmissionCategory;
  fide_rated: boolean;
  organizer_name: string;
  organizer_email: string | null;
  external_link: string | null;
  source: 'submission';
  status: typeof PENDING_STATUS;
}

export type SubmissionFieldErrors = Partial<Record<string, string>>;

export type ParsedSubmission =
  | { ok: true; row: SubmissionRow }
  | { ok: false; spam: true }
  | { ok: false; spam: false; errors: SubmissionFieldErrors };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
// Control characters and the angle brackets that make markup. Names are rendered by React and
// escaped in JSON-LD, but a moderator reads them in a dashboard too.
const UNSAFE_TEXT = /[\u0000-\u001f\u007f<>]/;

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function lengthError(value: string, label: string, min: number, max: number): string | undefined {
  if (value.length < min) return `${label} is required (at least ${min} characters).`;
  if (value.length > max) return `${label} must be ${max} characters or fewer.`;
  if (UNSAFE_TEXT.test(value)) return `${label} contains characters that are not allowed.`;
  return undefined;
}

/** A link must be a plain http(s) URL with no embedded credentials. */
export function isAcceptableLink(value: string): boolean {
  if (value.length > 500) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Validates a submission body. `today` is "YYYY-MM-DD" (UTC). A non-empty honeypot field (`website`,
 * hidden in the form) marks the request as spam and is reported separately so the caller can
 * answer it without revealing why.
 */
export function parseSubmission(body: unknown, today: string): ParsedSubmission {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, spam: false, errors: { form: 'Request body must be a JSON object.' } };
  }
  const input = body as Record<string, unknown>;

  if (text(input.website) !== '') return { ok: false, spam: true };

  const errors: SubmissionFieldErrors = {};

  const name = text(input.name);
  const nameError = lengthError(name, 'Name', 3, 160);
  if (nameError) errors.name = nameError;

  const city = text(input.city);
  const cityError = lengthError(city, 'City', 2, 100);
  if (cityError) errors.city = cityError;

  const organizer = text(input.organizer_name);
  const organizerError = lengthError(organizer, 'Organizer', 2, 120);
  if (organizerError) errors.organizer_name = organizerError;

  const date = text(input.date);
  if (!isRealDate(date)) {
    errors.date = 'Start date must be a real date in YYYY-MM-DD form.';
  } else if (date < today) {
    errors.date = 'Start date must be today or later.';
  } else if (!isPlausibleStartDate(date, today)) {
    errors.date = 'Start date is more than two years away.';
  }

  const endRaw = text(input.end_date);
  let endDate = date;
  if (endRaw !== '') {
    if (!isRealDate(endRaw)) {
      errors.end_date = 'End date must be a real date in YYYY-MM-DD form.';
    } else if (isRealDate(date) && endRaw < date) {
      errors.end_date = 'End date cannot be before the start date.';
    } else if (isRealDate(date) && daysBetween(date, endRaw) > MAX_EVENT_DAYS) {
      errors.end_date = `An event cannot run longer than ${MAX_EVENT_DAYS} days.`;
    } else {
      endDate = endRaw;
    }
  }

  const code = text(input.country_code).toUpperCase();
  const country = countryCodeToName(code);
  if (!/^[A-Z]{2}$/.test(code) || !country || !listCountries().some((c) => c.code === code)) {
    errors.country_code = 'Choose a country from the list.';
  }

  const category = text(input.category);
  if (!(SUBMISSION_CATEGORIES as readonly string[]).includes(category)) {
    errors.category = `Category must be one of ${SUBMISSION_CATEGORIES.join(', ')}.`;
  }

  if (typeof input.fide_rated !== 'boolean') {
    errors.fide_rated = 'Say whether the event is FIDE rated.';
  }

  const link = text(input.external_link);
  if (link !== '' && !isAcceptableLink(link)) {
    errors.external_link = 'The link must be a plain http or https URL.';
  }

  const email = text(input.organizer_email);
  if (email !== '' && (email.length > 200 || !EMAIL.test(email))) {
    errors.organizer_email = 'That does not look like an email address.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, spam: false, errors };

  return {
    ok: true,
    row: {
      name,
      date,
      end_date: endDate,
      city,
      country: country as string,
      country_code: code,
      category: category as SubmissionCategory,
      fide_rated: input.fide_rated as boolean,
      organizer_name: organizer,
      organizer_email: email === '' ? null : email,
      external_link: link === '' ? null : link,
      source: 'submission',
      status: PENDING_STATUS,
    },
  };
}

/** Best-effort client address from the forwarding headers a proxy sets; "unknown" when absent. */
export function clientAddress(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim() || 'unknown';
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * A fixed-window counter per key, held in memory. It slows one client down inside one server
 * instance; it is not a global limit (serverless instances do not share memory), which is why the
 * route also caps how many submissions can be waiting for review.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    /** True when this request is allowed. */
    take(key: string, now: number = Date.now()): boolean {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
    /** Drops expired keys so the map cannot grow without bound. */
    sweep(now: number = Date.now()): void {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    },
  };
}
