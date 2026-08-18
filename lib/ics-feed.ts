// Pure ICS (RFC 5545) feed helpers for the per-country calendar route.
// No imports — runnable standalone via node lib/ics-feed.selfcheck.mjs.

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