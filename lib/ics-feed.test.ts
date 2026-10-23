import { describe, expect, it } from 'vitest';
import { icsEscape, foldLine, dayAfter, icsDate } from './ics-feed';

describe('icsEscape', () => {
  it('escapes backslash, semicolon, comma and newline, backslash first', () => {
    expect(icsEscape('A\\B;C,D\nE')).toBe('A\\\\B\\;C\\,D\\nE');
  });

  it('leaves plain text alone', () => {
    expect(icsEscape('plain text')).toBe('plain text');
  });

  it('turns CRLF into a single escaped newline', () => {
    expect(icsEscape('CRLF\r\nhere')).toBe('CRLF\\nhere');
  });

  it('escapes a lone backslash', () => {
    expect(icsEscape('\\')).toBe('\\\\');
  });
});

describe('dayAfter', () => {
  it('is the next day, crossing month and year boundaries', () => {
    expect(dayAfter('2026-08-18')).toBe('2026-08-19');
    expect(dayAfter('2026-08-31')).toBe('2026-09-01');
    expect(dayAfter('2026-12-31')).toBe('2027-01-01');
    expect(dayAfter('2026-02-28')).toBe('2026-03-01');
  });

  it('handles a leap day', () => {
    expect(dayAfter('2028-02-28')).toBe('2028-02-29');
    expect(dayAfter('2028-02-29')).toBe('2028-03-01');
  });
});

describe('icsDate', () => {
  it('formats a date as YYYYMMDD', () => {
    expect(icsDate('2026-08-18')).toBe('20260818');
  });
});

describe('foldLine', () => {
  it('leaves a short line untouched', () => {
    expect(foldLine('short')).toBe('short');
  });

  it('folds a long line at 74 characters with CRLF and a space, losing nothing', () => {
    const long = 'x'.repeat(200);
    const folded = foldLine(long);
    expect(folded.startsWith('x'.repeat(74) + '\r\n ')).toBe(true);
    // Every continuation line starts with a space.
    expect(folded.includes('\r\nx')).toBe(false);
    expect(folded.replace(/\r\n /g, '')).toHaveLength(200);
  });

  it('never splits a multi-byte character', () => {
    const accented = 'é'.repeat(80);
    const folded = foldLine(accented);
    expect(folded.replace(/\r\n /g, '')).toBe(accented);
  });

  it('never leaves an orphaned surrogate half at the start of a folded segment', () => {
    const emoji = '\u{1F3C6}'.repeat(60);
    const folded = foldLine(emoji);
    expect(folded.replace(/\r\n /g, '')).toBe(emoji);
    for (const segment of folded.split('\r\n ')) {
      expect(/^[\uDC00-\uDFFF]/.test(segment)).toBe(false);
    }
  });
});

describe('an assembled event', () => {
  it('escapes the summary and keeps the UID', () => {
    const summary = icsEscape('Nuremberg Open; "A"');
    const vevent = [
      'BEGIN:VEVENT',
      'UID:tournament-t1@tourneyradar.com',
      'DTSTAMP:20260818T120000Z',
      'DTSTART;VALUE=DATE:20260818',
      'DTEND;VALUE=DATE:20260824',
      `SUMMARY:${summary}`,
    ]
      .map(foldLine)
      .join('\r\n');
    expect(vevent).toContain('UID:tournament-t1@tourneyradar.com');
    expect(vevent).toContain('SUMMARY:Nuremberg Open\\; "A"');
  });
});
