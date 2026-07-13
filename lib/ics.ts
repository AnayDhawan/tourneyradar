export interface IcsTournament {
  id: string;
  name: string;
  date: string;
  end_date?: string;
  location?: string;
}

function parseYmd(dateStr: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function formatYmd(y: number, m: number, d: number): string {
  return `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
}

function toDtstart(dateStr: string): string {
  const p = parseYmd(dateStr);
  return p ? formatYmd(p.y, p.m, p.d) : "";
}

// DTEND with VALUE=DATE is exclusive per RFC 5545, so add one day.
function toDtendExclusive(dateStr: string): string {
  const p = parseYmd(dateStr);
  if (!p) return "";
  const next = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
  return formatYmd(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildTournamentIcs(t: IcsTournament): string {
  const dtstart = toDtstart(t.date);
  const dtend = toDtendExclusive(t.end_date || t.date);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TourneyRadar//Tournament Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${t.id}@tourneyradar.com`,
    `DTSTAMP:${nowStamp()}`,
    dtstart ? `DTSTART;VALUE=DATE:${dtstart}` : null,
    dtend ? `DTEND;VALUE=DATE:${dtend}` : null,
    `SUMMARY:${escapeIcsText(t.name)}`,
    t.location ? `LOCATION:${escapeIcsText(t.location)}` : null,
    `URL:https://www.tourneyradar.com/tournaments/${t.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => Boolean(l));
  return lines.join("\r\n");
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim().replace(/\s+/g, "-").slice(0, 100);
  return cleaned || "tournament";
}

export function downloadTournamentIcs(t: IcsTournament): void {
  const ics = buildTournamentIcs(t);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFilename(t.name)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
