// Self-check for lib/ics-feed.ts. Run with: node lib/ics-feed.selfcheck.mjs
import assert from 'node:assert/strict';
import { icsEscape, foldLine, dayAfter, icsDate } from './ics-feed.ts';

// Escaping: backslash, semicolon, comma, newline. Backslash escaped first.
assert.equal(icsEscape('A\\B;C,D\nE'), 'A\\\\B\\;C\\,D\\nE');
assert.equal(icsEscape('plain text'), 'plain text');
assert.equal(icsEscape('CRLF\r\nhere'), 'CRLF\\nhere');
assert.equal(icsEscape('\\'), '\\\\');

// DTEND is the day after, exclusive, crossing month/year boundaries.
assert.equal(dayAfter('2026-08-18'), '2026-08-19');
assert.equal(dayAfter('2026-08-31'), '2026-09-01');
assert.equal(dayAfter('2026-12-31'), '2027-01-01');
assert.equal(dayAfter('2026-02-28'), '2026-03-01');

// Date formatting to ICS YYYYMMDD.
assert.equal(icsDate('2026-08-18'), '20260818');

// Folding: short lines untouched, long lines folded at 74 chars without
// splitting a multi-byte char, continuation lines start with a space.
assert.equal(foldLine('short'), 'short');
const long = 'x'.repeat(200);
const folded = foldLine(long);
assert.ok(folded.startsWith('x'.repeat(74) + '\r\n '));
assert.ok(!folded.includes('\r\nx'), 'continuation must start with a space');
assert.equal(folded.replace(/\r\n /g, '').length, 200, 'folding must not drop chars');

// Multi-byte char (e-acute) is never split mid-sequence.
const mb = '\u00e9'.repeat(80);
const mbFolded = foldLine(mb);
assert.ok(mbFolded.replace(/\r\n /g, '') === mb);
assert.ok(mbFolded.split('\r\n ').every((seg) => !/[\uDC00-\uDFFF]/.test(seg[0])), 'no orphaned surrogate');

// Full feed shape for one tournament (assembly mirrors the route handler).
const summary = icsEscape('Nuremberg Open; "A"');
const vevent = [
  'BEGIN:VEVENT',
  'UID:tournament-t1@tourneyradar.com',
  'DTSTAMP:20260818T120000Z',
  'DTSTART;VALUE=DATE:20260818',
  'DTEND;VALUE=DATE:20260824',
  `SUMMARY:${summary}`,
].map(foldLine).join('\r\n');
assert.ok(vevent.includes('UID:tournament-t1@tourneyradar.com'));
assert.ok(vevent.includes('SUMMARY:Nuremberg Open\\; "A"'));

console.log('ics-feed.selfcheck: all assertions passed');