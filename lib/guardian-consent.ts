import { createHash, randomBytes } from 'node:crypto';

// Parental consent for under-16 accounts (issue #254, GDPR Art. 8(2)).
//
// Pure helpers only. Database access lives in guardian-consent-server.ts so
// everything here can be tested without a client.

export type AgeBasis = '16_or_older' | 'parental_consent';

export type AgeCheckStatus =
  | 'unknown' // no answer stored: an account from before the age question
  | 'adult' // confirmed 16 or older
  | 'guardian_needed' // under 16, no live confirmation link
  | 'guardian_pending' // under 16, link sent and not yet used
  | 'guardian_confirmed';

export interface AgeCheckRow {
  age_basis: AgeBasis;
  guardian_email: string | null;
  guardian_token_hash: string | null;
  guardian_requested_at: string | null;
  guardian_expires_at: string | null;
  guardian_send_count: number;
  guardian_confirmed_at: string | null;
}

export const GUARDIAN_LINK_TTL_DAYS = 14;
export const GUARDIAN_RESEND_COOLDOWN_MINUTES = 10;
// Stops the endpoint being used to mail an arbitrary address over and over.
export const GUARDIAN_MAX_SENDS = 5;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isAgeBasis(value: unknown): value is AgeBasis {
  return value === '16_or_older' || value === 'parental_consent';
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A fresh link token. Only the hash is stored. */
export function newGuardianToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return null;
  return `${local.slice(0, 1)}***@${domain}`;
}

export function deriveStatus(row: AgeCheckRow | null, now: Date = new Date()): AgeCheckStatus {
  if (!row) return 'unknown';
  if (row.age_basis === '16_or_older') return 'adult';
  if (row.guardian_confirmed_at) return 'guardian_confirmed';
  const live =
    row.guardian_token_hash && row.guardian_expires_at && new Date(row.guardian_expires_at) > now;
  return live ? 'guardian_pending' : 'guardian_needed';
}

/** Under 16 and not yet confirmed: no weekly emails, nothing public. */
export function isLimited(status: AgeCheckStatus): boolean {
  return status === 'guardian_needed' || status === 'guardian_pending';
}

/** Minutes the caller must still wait before another link may be sent, or 0. */
export function resendWaitMinutes(row: AgeCheckRow | null, now: Date = new Date()): number {
  if (!row?.guardian_requested_at) return 0;
  const readyAt =
    new Date(row.guardian_requested_at).getTime() + GUARDIAN_RESEND_COOLDOWN_MINUTES * 60_000;
  return Math.max(0, Math.ceil((readyAt - now.getTime()) / 60_000));
}
