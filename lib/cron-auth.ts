import { timingSafeEqual } from 'node:crypto';

export type CronAuth = 'ok' | 'unauthorized' | 'not-configured';

/**
 * Checks a cron request's `Authorization` header against CRON_SECRET. It fails closed: with no
 * secret configured nothing is authorised, instead of every caller being let through. The compare
 * is constant-time so the secret cannot be guessed from response timing.
 */
export function checkCronAuth(authHeader: string | null, secret: string | undefined): CronAuth {
  if (!secret) return 'not-configured';
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authHeader ?? '');
  if (given.length !== expected.length) return 'unauthorized';
  return timingSafeEqual(given, expected) ? 'ok' : 'unauthorized';
}
