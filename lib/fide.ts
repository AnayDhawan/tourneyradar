// FIDE rating history (issue #128).
//
// FIDE has no official public REST API. This calls the internal endpoint
// that ratings.fide.com's own profile page uses to render its rating chart:
// a POST to `/a_chart_data.phtml?event={fideId}&period={n}` that ships as
// inline jQuery on the profile page itself (view-source on
// https://ratings.fide.com/profile/<id> and look for `showGraph`). It is not
// a documented or versioned API, just a PHP endpoint an SPA-ish profile page
// happens to call, so it is screen-scraping-adjacent: FIDE can rename it,
// change its response shape, or block non-browser traffic at any time with
// no notice and no changelog. Treat every call through this file as "best
// effort, might silently stop working" rather than a stable dependency.
//
// VERIFIED LIVE 2026-08-30 against two real FIDE IDs:
//   - 1503014 (Magnus Carlsen) returned real multi-year standard/rapid/blitz
//     history going back to 2003.
//   - A made-up 8-digit ID and a non-numeric ID both returned HTTP 200 with
//     a genuinely empty body (zero bytes, not even "[]"), not an error
//     status, which is why `fetchFideRatingHistory` treats "empty body" as
//     "no data" rather than as a failure.
// This was NOT verified from Node/the Next.js runtime in this environment,
// only via curl in the sandbox shell, so there is some chance a real
// deployment sees different behavior (e.g. FIDE blocking the hosting
// provider's IP range, or a stricter bot check on repeated automated
// requests). Do a live smoke test from the actual deployment before
// shipping this as a real feature, not just from local dev.
//
// period query param, confirmed from the same inline script:
//   0 = all years (used here, richest data for a trend chart)
//   1 = one year, 2 = two years, 3 = three years, 5 = five years
//
// Response shape (confirmed live): a JSON array, one object per FIDE rating
// list period (roughly monthly), e.g.:
//   { "date_2": "2026-Jan", "rating": "2840", "rapid_rtng": "2832",
//     "blitz_rtng": "2869", "period_games": "0", "rapid_games": "13",
//     "blitz_games": "27", "name": "Carlsen, Magnus", "country": "NOR",
//     "id_number": "1503014" }
// All rating/game-count fields are JSON strings (not numbers) and can be the
// JSON value null for periods before a player had a rating in that format
// (e.g. rapid/blitz ratings are recent additions, so most players have years
// of standard-only history). The response body also has a leading UTF-8 BOM
// on at least some responses, which breaks a naive JSON.parse if not
// stripped first.

const FIDE_CHART_ENDPOINT = "https://ratings.fide.com/a_chart_data.phtml";
const FIDE_REQUEST_TIMEOUT_MS = 8_000;

// Leading UTF-8 BOM observed on FIDE's response body; stripped before
// JSON.parse. Written as an escape rather than a literal character so it
// survives editing/encoding round-trips unambiguously.
const BOM = "﻿";

export type FideRatingPeriod = "one_year" | "two_years" | "three_years" | "five_years" | "all_years";

const PERIOD_PARAM: Record<FideRatingPeriod, string> = {
  one_year: "1",
  two_years: "2",
  three_years: "3",
  five_years: "5",
  all_years: "0",
};

export interface FideRatingPoint {
  period: string;
  standard: number | null;
  rapid: number | null;
  blitz: number | null;
}

// Raw shape of one element in FIDE's a_chart_data.phtml response. Every
// field arrives as a JSON string or null; nothing here should be trusted as
// already-numeric.
interface RawFideChartEntry {
  date_2?: unknown;
  rating?: unknown;
  rapid_rtng?: unknown;
  blitz_rtng?: unknown;
}

function toNullableInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

// A real FIDE ID is a numeric string (e.g. "25635938"). The registration
// form (app/player/register/page.tsx) has never validated this, so anything
// could be sitting in players.fide_id for existing rows. Reject obviously
// malformed input before making a network call rather than letting FIDE's
// endpoint (silently) decide.
function isPlausibleFideId(fideId: string): boolean {
  return /^\d{4,10}$/.test(fideId.trim());
}

/**
 * Fetches a FIDE player's historical rating list (standard/rapid/blitz per
 * period) from FIDE's own ratings site.
 *
 * Never throws. A malformed fide_id, an unreachable or changed endpoint, a
 * non-JSON or empty response, or a request timeout all resolve to an empty
 * array so a caller can render "no data yet" instead of crashing a page.
 */
export async function fetchFideRatingHistory(
  fideId: string,
  period: FideRatingPeriod = "all_years"
): Promise<FideRatingPoint[]> {
  const trimmedId = (fideId ?? "").trim();
  if (!isPlausibleFideId(trimmedId)) {
    return [];
  }

  const url = `${FIDE_CHART_ENDPOINT}?event=${encodeURIComponent(trimmedId)}&period=${PERIOD_PARAM[period]}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIDE_REQUEST_TIMEOUT_MS);

  let body: string;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    body = await response.text();
  } catch {
    // Network error, timeout, DNS failure, FIDE blocking the request, etc.
    // This endpoint has no SLA and no docs, so any failure here is expected
    // to happen eventually; degrade to "no data" rather than propagate.
    return [];
  } finally {
    clearTimeout(timeout);
  }

  // FIDE's endpoint returns a genuinely empty body (not "[]") for an
  // unknown/invalid FIDE ID.
  const cleaned = (body.startsWith(BOM) ? body.slice(BOM.length) : body).trim();
  if (!cleaned) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // FIDE changed the response shape, or returned an HTML error page
    // instead of JSON. Either way, this is the "endpoint changed under us"
    // failure mode called out above.
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return (parsed as RawFideChartEntry[])
    .filter((entry): entry is RawFideChartEntry => typeof entry?.date_2 === "string" && entry.date_2.length > 0)
    .map((entry) => ({
      period: entry.date_2 as string,
      standard: toNullableInt(entry.rating),
      rapid: toNullableInt(entry.rapid_rtng),
      blitz: toNullableInt(entry.blitz_rtng),
    }));
}
