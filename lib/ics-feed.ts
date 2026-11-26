// Pure ICS (RFC 5545) feed helpers shared by the per-country calendar route and
// the private wishlist feed. No imports. Covered by lib/ics-feed.test.ts (npm test).

// Backslash, semicolon, comma and newline must be escaped in text fields.
// Backslash first so escaped chars aren't double-escaped.
export function icsEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Lines should be at most 75 octets, folded with CRLF + space. Fold on code
// points so multi-byte characters are never split mid-sequence.
export function foldLine(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let current = '';
  for (const ch of line) {
    if (current.length + ch.length > 74) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts.join('\r\n ');
}

// All-day events: DTEND is the day AFTER the last day (RFC 5545 end is exclusive).
export function dayAfter(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function icsDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

export interface IcsTournament {
  id: string;
  name: string;
  date: string;
  end_date: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

// UTC timestamp in the basic format RFC 5545 wants for DTSTAMP.
export function icsDtstamp(now: Date): string {
  return now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

// One all-day VEVENT, folded and joined with CRLF.
export function tournamentToVEvent(
  t: IcsTournament,
  options: { siteUrl: string; dtstamp: string }
): string {
  const endDay = dayAfter(t.end_date || t.date);
  const locationParts = [t.city, t.state, t.country].filter(Boolean) as string[];
  // DESCRIPTION is a TEXT value like SUMMARY and LOCATION, so commas and
  // semicolons in a place name must be escaped (RFC 5545 section 3.3.11).
  const description = [
    `Location: ${icsEscape(locationParts.join(', ')) || 'TBA'}`,
    `Link: ${options.siteUrl}/tournaments/${t.id}`,
  ].join('\\n');

  return [
    'BEGIN:VEVENT',
    `UID:tournament-${t.id}@tourneyradar.com`,
    `DTSTAMP:${options.dtstamp}`,
    `DTSTART;VALUE=DATE:${icsDate(t.date)}`,
    `DTEND;VALUE=DATE:${icsDate(endDay)}`,
    `SUMMARY:${icsEscape(t.name)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${icsEscape(locationParts.join(', '))}`,
    'END:VEVENT',
  ]
    .map(foldLine)
    .join('\r\n');
}

// Wraps already-built VEVENT blocks in a VCALENDAR. Header lines are passed
// through as given, so a caller adds anything beyond the defaults (for
// instance REFRESH-INTERVAL) with `extraHeaders`.
export function buildCalendar(options: {
  calName: string;
  events: string[];
  extraHeaders?: string[];
}): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TourneyRadar//TourneyRadar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(options.calName)}`,
    ...(options.extraHeaders ?? []),
    ...options.events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
