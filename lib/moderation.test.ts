import { describe, expect, it } from 'vitest';
import {
  CLEARED_REVIEW,
  MAX_REASON_LENGTH,
  SUBMISSION_SOURCE,
  buildApprovalPatch,
  buildRejectionPatch,
  buildReviewRecord,
  noteFor,
  parseModerationRequest,
  planTransition,
  resolveApprovalFields,
  type StoredSubmission,
} from './moderation';

const NOW = new Date('2026-11-26T10:00:00Z');

const stored = (over: Partial<StoredSubmission> = {}): StoredSubmission => ({
  name: 'Pune Club Rapid',
  date: '2026-12-20',
  end_date: '2026-12-21',
  city: 'Pune',
  country_code: 'IN',
  category: 'Rapid',
  fide_rated: false,
  external_link: 'https://example.org/pune',
  ...over,
});

describe('planTransition', () => {
  it('approves a pending submission into published', () => {
    expect(planTransition({ status: 'pending', source: SUBMISSION_SOURCE }, 'approve')).toEqual({
      ok: true,
      next: 'published',
      decision: 'approved',
    });
  });

  it('rejects a pending submission into rejected', () => {
    expect(planTransition({ status: 'pending', source: SUBMISSION_SOURCE }, 'reject')).toEqual({
      ok: true,
      next: 'rejected',
      decision: 'rejected',
    });
  });

  it.each(['published', 'rejected', 'invalid_date', null])('refuses to move a %s submission again', (status) => {
    for (const action of ['approve', 'reject'] as const) {
      expect(planTransition({ status, source: SUBMISSION_SOURCE }, action)).toEqual({
        ok: false,
        reason: 'already_decided',
      });
    }
  });

  it('never touches a scraped tournament, whatever its status', () => {
    for (const status of ['pending', 'published']) {
      expect(planTransition({ status, source: 'chess-results' }, 'approve')).toEqual({
        ok: false,
        reason: 'not_a_submission',
      });
    }
    expect(planTransition({ status: 'pending', source: null }, 'reject')).toMatchObject({ ok: false });
  });
});

describe('parseModerationRequest', () => {
  it('requires a reason to reject, and trims it', () => {
    expect(parseModerationRequest({ action: 'reject' })).toMatchObject({ ok: false });
    expect(parseModerationRequest({ action: 'reject', reason: '   ' })).toMatchObject({ ok: false });
    expect(parseModerationRequest({ action: 'reject', reason: '  Duplicate of   a scraped event ' })).toEqual({
      ok: true,
      value: { action: 'reject', reason: 'Duplicate of a scraped event' },
    });
  });

  it('caps the reason length', () => {
    const long = 'x'.repeat(MAX_REASON_LENGTH + 1);
    expect(parseModerationRequest({ action: 'reject', reason: long })).toMatchObject({ ok: false });
    expect(parseModerationRequest({ action: 'reject', reason: 'x'.repeat(MAX_REASON_LENGTH) })).toMatchObject({ ok: true });
  });

  it('accepts a plain approval with an optional note', () => {
    expect(parseModerationRequest({ action: 'approve' })).toEqual({
      ok: true,
      value: { action: 'approve', note: null, edits: null, coordinates: null },
    });
    expect(parseModerationRequest({ action: 'approve', note: 'Checked the link' })).toMatchObject({
      ok: true,
      value: { note: 'Checked the link' },
    });
  });

  it('keeps only editable fields from edits', () => {
    const result = parseModerationRequest({
      action: 'approve',
      edits: { name: 'Fixed', status: 'published', source: 'x', id: 'y', lat: 1 },
    });
    expect(result).toEqual({
      ok: true,
      value: { action: 'approve', note: null, edits: { name: 'Fixed' }, coordinates: null },
    });
  });

  it('validates coordinates', () => {
    expect(parseModerationRequest({ action: 'approve', lat: 18.5, lng: 73.8 })).toMatchObject({
      ok: true,
      value: { coordinates: { lat: 18.5, lng: 73.8 } },
    });
    for (const bad of [
      { lat: 91, lng: 0 },
      { lat: 0, lng: 181 },
      { lat: 10 },
      { lat: '10', lng: '20' },
      { lat: Number.NaN, lng: 1 },
    ]) {
      expect(parseModerationRequest({ action: 'approve', ...bad })).toMatchObject({ ok: false });
    }
  });

  it('rejects unknown actions and non-object bodies', () => {
    expect(parseModerationRequest({ action: 'publish' })).toMatchObject({ ok: false });
    expect(parseModerationRequest({})).toMatchObject({ ok: false });
    for (const body of [null, 'approve', 3, [], undefined]) {
      expect(parseModerationRequest(body)).toMatchObject({ ok: false });
    }
    expect(parseModerationRequest({ action: 'approve', edits: 'name' })).toMatchObject({ ok: false });
  });
});

describe('resolveApprovalFields', () => {
  it('publishes the stored listing as it is when nothing was edited', () => {
    const result = resolveApprovalFields(stored(), null, NOW);
    expect(result).toMatchObject({ ok: true, edited: false, value: { name: 'Pune Club Rapid', country: 'India' } });
  });

  it('still publishes an unedited submission whose start date has since passed', () => {
    const result = resolveApprovalFields(stored({ date: '2026-11-01', end_date: '2026-11-02' }), null, NOW);
    expect(result).toMatchObject({ ok: true });
  });

  it('lays edits over the stored fields and validates the whole', () => {
    const result = resolveApprovalFields(stored(), { name: '  Pune   Rapid Open ', fide_rated: true }, NOW);
    expect(result).toMatchObject({
      ok: true,
      edited: true,
      value: { name: 'Pune Rapid Open', fide_rated: true, city: 'Pune' },
    });
  });

  it('refuses an edit a visitor could not have submitted', () => {
    const result = resolveApprovalFields(stored(), { external_link: 'javascript:alert(1)', city: '' }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['city', 'external_link']);
  });
});

describe('patches and audit record', () => {
  it('an approval publishes, places and stamps the listing', () => {
    const fields = resolveApprovalFields(stored(), null, NOW);
    if (!fields.ok) throw new Error('fixture invalid');
    const patch = buildApprovalPatch(fields.value, { lat: 18.52, lng: 73.85 }, NOW);

    expect(patch).toMatchObject({
      status: 'published',
      lat: 18.52,
      lng: 73.85,
      scraped_at: NOW.toISOString(),
      country: 'India',
    });
    expect(patch).not.toHaveProperty('source');
    expect(patch).not.toHaveProperty('id');
  });

  it('a rejection changes only the status', () => {
    expect(buildRejectionPatch()).toEqual({ status: 'rejected' });
  });

  it('records who decided what, when and why', () => {
    expect(
      buildReviewRecord({ decision: 'rejected', reviewedBy: 'admin-1', source: 'dashboard', note: 'Spam', now: NOW })
    ).toEqual({
      reviewed_at: NOW.toISOString(),
      decision: 'rejected',
      reviewed_by: 'admin-1',
      review_source: 'dashboard',
      review_note: 'Spam',
    });
  });

  it('the CLI record has no reviewer but says where it came from', () => {
    expect(
      buildReviewRecord({ decision: 'approved', reviewedBy: null, source: 'cli', note: null, now: NOW })
    ).toMatchObject({ reviewed_by: null, review_source: 'cli', decision: 'approved' });
  });

  it('releasing a claim clears every audit column', () => {
    const record = buildReviewRecord({ decision: 'approved', reviewedBy: 'a', source: 'dashboard', note: null, now: NOW });
    expect(Object.keys(CLEARED_REVIEW).sort()).toEqual(Object.keys(record).sort());
    expect(Object.values(CLEARED_REVIEW).every((v) => v === null)).toBe(true);
  });

  it('noteFor picks the reason for a rejection and the note for an approval', () => {
    expect(noteFor({ action: 'reject', reason: 'Dup' })).toBe('Dup');
    expect(noteFor({ action: 'approve', note: 'ok', edits: null, coordinates: null })).toBe('ok');
  });
});
