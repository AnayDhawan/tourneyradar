import { describe, expect, it } from 'vitest';
import {
  GUARDIAN_RESEND_COOLDOWN_MINUTES,
  deriveStatus,
  hashToken,
  isLimited,
  maskEmail,
  newGuardianToken,
  normalizeEmail,
  resendWaitMinutes,
  type AgeCheckRow,
} from './guardian-consent';

const NOW = new Date('2026-11-14T12:00:00Z');

function row(overrides: Partial<AgeCheckRow> = {}): AgeCheckRow {
  return {
    age_basis: 'parental_consent',
    guardian_email: 'parent@example.com',
    guardian_token_hash: null,
    guardian_requested_at: null,
    guardian_expires_at: null,
    guardian_send_count: 0,
    guardian_confirmed_at: null,
    ...overrides,
  };
}

describe('deriveStatus', () => {
  it('asks accounts with no answer', () => {
    expect(deriveStatus(null, NOW)).toBe('unknown');
  });

  it('treats 16 or older as an adult account', () => {
    expect(deriveStatus(row({ age_basis: '16_or_older', guardian_email: null }), NOW)).toBe('adult');
  });

  it('needs a link when none has been sent', () => {
    expect(deriveStatus(row(), NOW)).toBe('guardian_needed');
  });

  it('is pending while a link is live', () => {
    const live = row({
      guardian_token_hash: 'h',
      guardian_expires_at: '2026-11-20T00:00:00Z',
    });
    expect(deriveStatus(live, NOW)).toBe('guardian_pending');
  });

  it('needs a new link once the old one has expired', () => {
    const expired = row({
      guardian_token_hash: 'h',
      guardian_expires_at: '2026-11-01T00:00:00Z',
    });
    expect(deriveStatus(expired, NOW)).toBe('guardian_needed');
  });

  it('is confirmed once the guardian clicked, whatever the link says', () => {
    const done = row({
      guardian_token_hash: 'h',
      guardian_expires_at: '2026-11-01T00:00:00Z',
      guardian_confirmed_at: '2026-11-10T00:00:00Z',
    });
    expect(deriveStatus(done, NOW)).toBe('guardian_confirmed');
  });
});

describe('isLimited', () => {
  it('limits under-16 accounts until confirmed, and nobody else', () => {
    expect(isLimited('guardian_needed')).toBe(true);
    expect(isLimited('guardian_pending')).toBe(true);
    expect(isLimited('guardian_confirmed')).toBe(false);
    expect(isLimited('adult')).toBe(false);
    expect(isLimited('unknown')).toBe(false);
  });
});

describe('tokens', () => {
  it('hashes deterministically and never returns the token as the hash', () => {
    const { token, hash } = newGuardianToken();
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('makes a different token every time', () => {
    expect(newGuardianToken().token).not.toBe(newGuardianToken().token);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases a valid address', () => {
    expect(normalizeEmail('  Parent@Example.COM ')).toBe('parent@example.com');
  });

  it.each(['', 'nope', 'a@b', 'a b@c.com', 42, null, undefined, `${'a'.repeat(250)}@x.com`])(
    'rejects %j',
    (value) => {
      expect(normalizeEmail(value)).toBeNull();
    }
  );
});

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('parent@example.com')).toBe('p***@example.com');
  });

  it('returns null for nothing', () => {
    expect(maskEmail(null)).toBeNull();
  });
});

describe('resendWaitMinutes', () => {
  it('is zero before any link was sent', () => {
    expect(resendWaitMinutes(row(), NOW)).toBe(0);
  });

  it('counts down the cooldown, then reaches zero', () => {
    const sent = row({ guardian_requested_at: '2026-11-14T11:55:00Z' });
    expect(resendWaitMinutes(sent, NOW)).toBe(GUARDIAN_RESEND_COOLDOWN_MINUTES - 5);
    const old = row({ guardian_requested_at: '2026-11-14T11:00:00Z' });
    expect(resendWaitMinutes(old, NOW)).toBe(0);
  });
});
