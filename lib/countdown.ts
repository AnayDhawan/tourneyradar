const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole UTC calendar days since the Unix epoch for a given instant. */
function utcDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS);
}

/**
 * Label for how far away a tournament is.
 *
 * Tournaments carry a date, not a time, so the label compares calendar days
 * (UTC, on both sides) instead of counting hours to midnight. That way an
 * event dated today reads "Starting today!" all day, and the day before it
 * reads "Tomorrow". Pass `now` to pin the clock in tests.
 */
export function getCountdown(dateStr: string, now: Date = new Date()): string {
  const target = new Date(dateStr);
  // Nothing to show for a date that can't be read.
  if (Number.isNaN(target.getTime())) return "";

  const days = utcDay(target) - utcDay(now);
  // Only show a countdown for today and future tournaments.
  if (days < 0) return "";

  if (days === 0) return "Starting today!";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days} days`;
  if (days <= 30) return `In ${Math.ceil(days / 7)} weeks`;
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
