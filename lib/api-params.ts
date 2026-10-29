// Shared request-parameter parsing for the public tournaments APIs.

/** Largest page size the tournaments endpoints will return. */
export const MAX_PAGE_LIMIT = 200;

// A bad `limit` or `page` is rejected up front rather than silently coerced:
// quietly ignoring a bad value hides caller bugs and makes the API look like it
// accepted input it actually discarded. Values that are merely too large are
// clamped by the caller.
export function parseBounded(
  raw: string | null,
  name: string
): { value?: number; error?: string } {
  if (raw === null || raw === '') return {};

  if (!/^\d+$/.test(raw)) {
    return { error: `${name} must be a positive integer` };
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    return { error: `${name} must be a positive integer` };
  }

  return { value };
}

export interface UpcomingBody {
  countries?: string[];
  category?: string;
  page: number;
  limit: number;
}

export type ParsedUpcomingBody =
  | { ok: true; value: UpcomingBody }
  | { ok: false; error: string };

const UPCOMING_DEFAULT_LIMIT = 50;
const MAX_COUNTRIES = 300;

function positiveInt(raw: unknown, name: string): { value?: number; error?: string } {
  if (raw === undefined) return {};
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 1) {
    return { error: `${name} must be a positive integer` };
  }
  return { value: raw };
}

// Validates the JSON body of POST /api/tournaments/upcoming. The limit is
// clamped to MAX_PAGE_LIMIT, so the value returned is the one the query uses.
export function parseUpcomingBody(body: unknown): ParsedUpcomingBody {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const { countries, category, page, limit } = body as Record<string, unknown>;

  if (countries !== undefined) {
    if (
      !Array.isArray(countries) ||
      countries.length > MAX_COUNTRIES ||
      !countries.every((c) => typeof c === 'string' && c.length > 0)
    ) {
      return { ok: false, error: 'countries must be an array of non-empty strings' };
    }
  }
  if (category !== undefined && typeof category !== 'string') {
    return { ok: false, error: 'category must be a string' };
  }

  const p = positiveInt(page, 'page');
  if (p.error) return { ok: false, error: p.error };
  const l = positiveInt(limit, 'limit');
  if (l.error) return { ok: false, error: l.error };

  return {
    ok: true,
    value: {
      countries: countries as string[] | undefined,
      category: category as string | undefined,
      page: p.value ?? 1,
      limit: Math.min(l.value ?? UPCOMING_DEFAULT_LIMIT, MAX_PAGE_LIMIT),
    },
  };
}

export { UPCOMING_DEFAULT_LIMIT };
