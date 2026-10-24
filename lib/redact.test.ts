import { describe, expect, it } from 'vitest';
import { redactEmails } from './redact';

describe('redactEmails', () => {
  it('replaces a bare address', () => {
    expect(redactEmails('player@example.com')).toBe('[redacted-email]');
  });

  it('replaces addresses inside a longer message', () => {
    expect(redactEmails('Resend rejected jane.doe+chess@mail.example.co.uk: mailbox full')).toBe(
      'Resend rejected [redacted-email]: mailbox full'
    );
  });

  it('replaces every address, not just the first', () => {
    expect(redactEmails('a@b.com and c@d.org')).toBe('[redacted-email] and [redacted-email]');
  });

  it('leaves text without an address untouched', () => {
    const text = '[digest] sent 4 emails covering 12 tournaments (9 weekly subscribers considered)';
    expect(redactEmails(text)).toBe(text);
  });

  it('is idempotent', () => {
    const once = redactEmails('x@y.com failed');
    expect(redactEmails(once)).toBe(once);
  });
});
