const DAY_MS = 24 * 60 * 60 * 1000;
const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Day number for a calendar date, so two dates subtract to whole days. */
function dayNumber(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** The calendar date an instant falls on in a time zone (the runtime's own by default). */
function dayInZone(date: Date, timeZone?: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return dayNumber(get("year"), get("month"), get("day"));
}

/**
 * Label for how far away a tournament is.
 *
 * Tournaments carry a date, not a time, so the label compares calendar days
 * instead of counting hours to midnight. "Today" is the viewer's calendar
 * date: a player in India at 01:00 sees an event dated today as "Starting
 * today!", not "Tomorrow" as UTC would say. Call it on the client only, since
 * the server's zone is not the viewer's. Pass `now` and `timeZone` to pin the
 * clock in tests.
 */
export function getCountdown(dateStr: string, now: Date = new Date(), timeZone?: string): string {
  const plain = PLAIN_DATE.exec(dateStr);
  let target: number;
  if (plain) {
    target = dayNumber(Number(plain[1]), Number(plain[2]), Number(plain[3]));
  } else {
    const instant = new Date(dateStr);
    // Nothing to show for a date that can't be read.
    if (Number.isNaN(instant.getTime())) return "";
    target = dayInZone(instant, timeZone);
  }

  const days = target - dayInZone(now, timeZone);
  // Only show a countdown for today and future tournaments.
  if (days < 0) return "";

  if (days === 0) return "Starting today!";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days} days`;
  if (days <= 30) {
    // Whole weeks, rounded down like months below: 8 days is "In 1 week".
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "In 1 week" : `In ${weeks} weeks`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? "In 1 month" : `In ${months} months`;
}

export function isNewTournament(createdAt: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}
