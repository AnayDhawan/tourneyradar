// Upper bound for a scraped tournament start date. scrapeTournament already
// drops past dates; this catches the opposite end: typos ("2926" for 2026)
// and non-Gregorian years (a Bikram Sambat 2083) that would otherwise be
// stored and listed as upcoming events.
//
// Dates are ISO "YYYY-MM-DD" strings, so string comparison is date order.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isPlausibleStartDate(
  start: string,
  today: string,
  maxYearsAhead = 2
): boolean {
  if (!ISO_DATE.test(start) || !ISO_DATE.test(today)) return false;
  const limitYear = String(Number(today.slice(0, 4)) + maxYearsAhead).padStart(4, '0');
  return start <= `${limitYear}${today.slice(4)}`;
}
