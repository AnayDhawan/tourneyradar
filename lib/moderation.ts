import {
  validateSubmission,
  type SubmissionCategory,
  type SubmissionInput,
  type ValidSubmission,
} from './tournament-submission';

// Moderation of organizer submissions (issue #263). Pure state-transition and
// request-shaping logic shared by the dashboard route and the CLI, kept free of
// I/O so every rule can be tested without a database.
//
// A submission is a `tournaments` row with source 'organizer-submission'. It
// starts 'pending' and moves exactly once, to 'published' or 'rejected'. Nothing
// here moves it back: a decision is final, and fixing one is a deliberate edit
// by someone with database access.

export const SUBMISSION_SOURCE = 'organizer-submission';
export const MAX_REASON_LENGTH = 500;

export type ModerationAction = 'approve' | 'reject';
export type Decision = 'approved' | 'rejected';
export type TournamentStatus = 'published' | 'rejected';
export type ReviewSource = 'dashboard' | 'cli';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type ModerationRequest =
  | { action: 'approve'; note: string | null; edits: SubmissionInput | null; coordinates: Coordinates | null }
  | { action: 'reject'; reason: string };

export type ParseResult =
  | { ok: true; value: ModerationRequest }
  | { ok: false; error: string; fields?: Record<string, string> };

// The only fields a moderator can change before approving. Anything else in the
// body is ignored, so a request cannot reach status, source or the audit columns.
const EDITABLE_FIELDS = [
  'name',
  'date',
  'end_date',
  'city',
  'country_code',
  'category',
  'fide_rated',
  'external_link',
] as const satisfies readonly (keyof SubmissionInput)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Control characters and line/paragraph separators have no place in a note.
const CONTROL = new RegExp('[\\u0000-\\u001f\\u007f\\u2028\\u2029]', 'g');

function cleanNote(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Same treatment as other free text: no control characters, collapsed spaces.
  const text = value.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
  return text === '' ? null : text;
}

function parseCoordinates(lat: unknown, lng: unknown): Coordinates | null | 'invalid' {
  const absent = (v: unknown) => v === undefined || v === null || v === '';
  if (absent(lat) && absent(lng)) return null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return 'invalid';
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'invalid';
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return 'invalid';
  return { lat, lng };
}

/** Validates the JSON body of a decision request. Never throws. */
export function parseModerationRequest(body: unknown): ParseResult {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be a JSON object' };

  if (body.action === 'reject') {
    const reason = cleanNote(body.reason);
    if (!reason) return { ok: false, error: 'Give a reason for rejecting', fields: { reason: 'A reason is required' } };
    if (reason.length > MAX_REASON_LENGTH) {
      return {
        ok: false,
        error: `The reason is limited to ${MAX_REASON_LENGTH} characters`,
        fields: { reason: `At most ${MAX_REASON_LENGTH} characters` },
      };
    }
    return { ok: true, value: { action: 'reject', reason } };
  }

  if (body.action === 'approve') {
    const note = cleanNote(body.note);
    if (note && note.length > MAX_REASON_LENGTH) {
      return {
        ok: false,
        error: `The note is limited to ${MAX_REASON_LENGTH} characters`,
        fields: { note: `At most ${MAX_REASON_LENGTH} characters` },
      };
    }

    let edits: SubmissionInput | null = null;
    if (body.edits !== undefined && body.edits !== null) {
      if (!isRecord(body.edits)) return { ok: false, error: 'edits must be an object' };
      const picked: SubmissionInput = {};
      for (const field of EDITABLE_FIELDS) {
        if (field in body.edits) picked[field] = body.edits[field];
      }
      edits = Object.keys(picked).length > 0 ? picked : null;
    }

    const coordinates = parseCoordinates(body.lat, body.lng);
    if (coordinates === 'invalid') {
      return {
        ok: false,
        error: 'Coordinates must be numbers: latitude within 90 and longitude within 180',
        fields: { lat: 'Invalid latitude or longitude' },
      };
    }

    return { ok: true, value: { action: 'approve', note, edits, coordinates } };
  }

  return { ok: false, error: 'action must be "approve" or "reject"' };
}

export interface SubmissionState {
  status: string | null;
  source: string | null;
}

export type TransitionResult =
  | { ok: true; next: TournamentStatus; decision: Decision }
  | { ok: false; reason: 'not_a_submission' | 'already_decided' };

/**
 * Whether a submission may take this action, and where it ends up. The one
 * legal move is pending -> published (approve) or pending -> rejected (reject).
 */
export function planTransition(current: SubmissionState, action: ModerationAction): TransitionResult {
  if (current.source !== SUBMISSION_SOURCE) return { ok: false, reason: 'not_a_submission' };
  if (current.status !== 'pending') return { ok: false, reason: 'already_decided' };
  return action === 'approve'
    ? { ok: true, next: 'published', decision: 'approved' }
    : { ok: true, next: 'rejected', decision: 'rejected' };
}

/** The stored fields of a pending submission, as the moderator sees them. */
export interface StoredSubmission {
  name: string;
  date: string;
  end_date: string | null;
  city: string;
  country_code: string;
  category: SubmissionCategory | string;
  fide_rated: boolean;
  external_link: string | null;
}

export type ApprovalFields =
  | { ok: true; value: ValidSubmission; edited: boolean }
  | { ok: false; errors: Record<string, string> };

/**
 * The listing to publish. With no edits the stored row is published as it is
 * (it was validated when it came in). With edits they are laid over the stored
 * fields and the whole result goes through the same validation a submission
 * does, so a moderator cannot publish something a visitor could not submit.
 */
export function resolveApprovalFields(
  stored: StoredSubmission,
  edits: SubmissionInput | null,
  now: Date = new Date()
): ApprovalFields {
  if (!edits) {
    const result = validateSubmission(
      { ...stored, end_date: stored.end_date ?? undefined },
      // A submission that sat in the queue past its start date is still worth
      // publishing as a record; validate it as of the day it was due.
      new Date(Date.parse(`${stored.date}T00:00:00Z`) || now.getTime())
    );
    return result.ok ? { ok: true, value: result.value, edited: false } : { ok: false, errors: result.errors };
  }

  const result = validateSubmission({ ...stored, ...edits }, now);
  return result.ok ? { ok: true, value: result.value, edited: true } : { ok: false, errors: result.errors };
}

/** The `tournaments` columns an approval writes. */
export function buildApprovalPatch(fields: ValidSubmission, coordinates: Coordinates, now: Date) {
  return {
    status: 'published' as const,
    name: fields.name,
    date: fields.date,
    end_date: fields.end_date,
    location: fields.city,
    city: fields.city,
    state: fields.country,
    country: fields.country,
    country_code: fields.country_code,
    category: fields.category,
    fide_rated: fields.fide_rated,
    external_link: fields.external_link,
    lat: coordinates.lat,
    lng: coordinates.lng,
    // The weekly digest picks events up by scraped_at.
    scraped_at: now.toISOString(),
  };
}

/** The `tournaments` columns a rejection writes: status only, the listing stays as sent. */
export function buildRejectionPatch() {
  return { status: 'rejected' as const };
}

export interface ReviewRecord {
  reviewed_at: string;
  decision: Decision;
  reviewed_by: string | null;
  review_source: ReviewSource;
  review_note: string | null;
}

/** The audit columns of `tournament_submissions`: who decided what, when, and why. */
export function buildReviewRecord(input: {
  decision: Decision;
  reviewedBy: string | null;
  source: ReviewSource;
  note: string | null;
  now: Date;
}): ReviewRecord {
  return {
    reviewed_at: input.now.toISOString(),
    decision: input.decision,
    reviewed_by: input.reviewedBy,
    review_source: input.source,
    review_note: input.note,
  };
}

/** Columns that undo buildReviewRecord, used to release a review that could not be completed. */
export const CLEARED_REVIEW = {
  reviewed_at: null,
  decision: null,
  reviewed_by: null,
  review_source: null,
  review_note: null,
} as const;

/** The audit note a request carries: the reason for a rejection, the optional note for an approval. */
export function noteFor(request: ModerationRequest): string | null {
  return request.action === 'reject' ? request.reason : request.note;
}
