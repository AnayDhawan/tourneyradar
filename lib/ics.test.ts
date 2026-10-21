import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTournamentIcs, type IcsTournament } from './ics';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T12:34:56Z'));
});

afterEach(() => vi.useRealTimers());

const base: IcsTournament = { id: 'cr_123', name: 'Kolkata Open', date: '2026-11-10' };
const lines = (t: IcsTournament) => buildTournamentIcs(t).split('\r\n');

describe('buildTournamentIcs', () => {
  it('is a valid calendar with one event, joined by CRLF', () => {
    const ics = buildTournamentIcs(base);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it('uses a stable UID and the event page as its URL', () => {
    expect(lines(base)).toContain('UID:cr_123@tourneyradar.com');
    expect(lines(base)).toContain('URL:https://www.tourneyradar.com/tournaments/cr_123');
  });

  it('stamps the event with the current time in UTC', () => {
    expect(lines(base)).toContain('DTSTAMP:20261021T123456Z');
  });

  it('a one-day event ends on the next day, because DTEND is exclusive', () => {
    expect(lines(base)).toContain('DTSTART;VALUE=DATE:20261110');
    expect(lines(base)).toContain('DTEND;VALUE=DATE:20261111');
  });

  it('a missing end date is treated as a one-day event', () => {
    expect(lines({ ...base, end_date: undefined })).toContain('DTEND;VALUE=DATE:20261111');
    expect(lines({ ...base, end_date: '' })).toContain('DTEND;VALUE=DATE:20261111');
  });

  it('a multi-day event ends the day after its last day', () => {
    expect(lines({ ...base, end_date: '2026-11-15' })).toContain('DTEND;VALUE=DATE:20261116');
  });

  it('crosses month and year boundaries', () => {
    expect(lines({ ...base, date: '2026-12-30', end_date: '2026-12-31' })).toContain('DTEND;VALUE=DATE:20270101');
    expect(lines({ ...base, date: '2026-10-31' })).toContain('DTEND;VALUE=DATE:20261101');
  });

  it('keeps the written date whatever timezone the machine is in, since only the date is used', () => {
    expect(lines({ ...base, date: '2026-11-10T23:30:00-08:00' })).toContain('DTSTART;VALUE=DATE:20261110');
  });

  it('leaves out the dates it cannot read instead of writing a broken line', () => {
    const result = lines({ ...base, date: 'soon' });
    expect(result.some((line) => line.startsWith('DTSTART'))).toBe(false);
    expect(result.some((line) => line.startsWith('DTEND'))).toBe(false);
  });

  it('escapes special characters in the summary and location', () => {
    const result = lines({ ...base, name: 'Open; "A", B\\C', location: 'Kolkata, WB; India' });
    expect(result).toContain('SUMMARY:Open\\; "A"\\, B\\\\C');
    expect(result).toContain('LOCATION:Kolkata\\, WB\\; India');
  });

  it('leaves out the location when there is none', () => {
    expect(lines(base).some((line) => line.startsWith('LOCATION'))).toBe(false);
  });
});
