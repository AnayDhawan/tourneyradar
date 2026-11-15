import { describe, expect, it } from 'vitest';
import { submissionToRow, validateSubmission, type SubmissionInput } from './tournament-submission';

const NOW = new Date('2026-11-14T12:00:00Z');

const good: SubmissionInput = {
  name: '  Pune   Club Rapid ',
  date: '2026-12-05',
  end_date: '2026-12-06',
  city: 'Pune',
  country_code: 'in',
  category: 'Rapid',
  fide_rated: false,
  external_link: 'https://example.org/pune-rapid',
};

function errorsFor(overrides: SubmissionInput): Record<string, string> {
  const result = validateSubmission({ ...good, ...overrides }, NOW);
  return result.ok ? {} : result.errors;
}

describe('validateSubmission', () => {
  it('accepts a good submission and normalises it', () => {
    const result = validateSubmission(good, NOW);
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Pune Club Rapid',
        date: '2026-12-05',
        end_date: '2026-12-06',
        city: 'Pune',
        country: 'India',
        country_code: 'IN',
        category: 'Rapid',
        fide_rated: false,
        external_link: 'https://example.org/pune-rapid',
      },
    });
  });

  it('uses the start date as the end date when none is given', () => {
    for (const end_date of [undefined, null, '']) {
      const result = validateSubmission({ ...good, end_date }, NOW);
      expect(result.ok && result.value.end_date).toBe('2026-12-05');
    }
  });

  it('reports every bad field at once', () => {
    const result = validateSubmission({}, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ['category', 'city', 'country_code', 'date', 'external_link', 'fide_rated', 'name']
      );
    }
  });

  it('strips control and zero-width characters from text', () => {
    const result = validateSubmission({ ...good, name: 'Open​\u0000 Cup' }, NOW);
    expect(result.ok && result.value.name).toBe('Open Cup');
  });

  it.each(['ab', 'x'.repeat(121), 42])('rejects the name %j', (name) => {
    expect(errorsFor({ name }).name).toBeDefined();
  });

  it('rejects an unknown country and a non-boolean FIDE flag', () => {
    expect(errorsFor({ country_code: 'ZZ' }).country_code).toBeDefined();
    expect(errorsFor({ country_code: 'India' }).country_code).toBeDefined();
    expect(errorsFor({ fide_rated: 'yes' }).fide_rated).toBeDefined();
  });

  it('rejects a category that is not one of the three', () => {
    expect(errorsFor({ category: 'Bullet' }).category).toBeDefined();
  });

  describe('dates', () => {
    it('rejects a date that is not a real day', () => {
      expect(errorsFor({ date: '2026-02-31' }).date).toBeDefined();
      expect(errorsFor({ date: '12/05/2026' }).date).toBeDefined();
    });

    it('rejects the past, but accepts today and a date that is today east of UTC', () => {
      expect(errorsFor({ date: '2026-11-01', end_date: null }).date).toBeDefined();
      expect(errorsFor({ date: '2026-11-14', end_date: null }).date).toBeUndefined();
      expect(errorsFor({ date: '2026-11-13', end_date: null }).date).toBeUndefined();
    });

    it('rejects a start more than two years away', () => {
      expect(errorsFor({ date: '2029-01-01', end_date: null }).date).toBeDefined();
    });

    it('rejects an end before the start, and an event longer than 60 days', () => {
      expect(errorsFor({ end_date: '2026-12-01' }).end_date).toBeDefined();
      expect(errorsFor({ end_date: '2027-03-01' }).end_date).toBeDefined();
      expect(errorsFor({ end_date: 'soon' }).end_date).toBeDefined();
    });
  });

  describe('link', () => {
    it.each([
      'javascript:alert(1)',
      'data:text/html,hi',
      'ftp://example.org/x',
      'not a url',
      'https://localhost/x',
      'https://user:pw@example.org/x',
      '',
      `https://example.org/${'a'.repeat(500)}`,
    ])('rejects %j', (external_link) => {
      expect(errorsFor({ external_link }).external_link).toBeDefined();
    });

    it('accepts http and https', () => {
      expect(errorsFor({ external_link: 'http://example.org/x' }).external_link).toBeUndefined();
    });
  });
});

describe('submissionToRow', () => {
  it('is pending, from the submission source, and unplaced until a moderator approves', () => {
    const result = validateSubmission(good, NOW);
    if (!result.ok) throw new Error('fixture should be valid');
    const row = submissionToRow('submitted_1', result.value);

    expect(row.status).toBe('pending');
    expect(row.source).toBe('organizer-submission');
    expect(row.id).toBe('submitted_1');
    expect(row.lat).toBeNull();
    expect(row.lng).toBeNull();
    expect(row.scraped_at).toBeNull();
    expect(row.state).toBe('India');
  });
});
