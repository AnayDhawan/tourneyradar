import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tournament } from './supabase';

const send = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

const tournament = {
  id: 'cr_1',
  name: 'Spring Open',
  date: '2026-11-14',
  city: 'Pune',
  country: 'India',
} as unknown as Tournament;

const RECIPIENT = 'player@example.com';

async function failureFor(resendMessage: string): Promise<Error> {
  send.mockResolvedValue({ error: { message: resendMessage } });
  const { sendDigestEmail } = await import('./email');
  const err = await sendDigestEmail(RECIPIENT, [tournament], 'https://example.com/unsub').catch(
    (e: unknown) => e
  );
  expect(err).toBeInstanceOf(Error);
  return err as Error;
}

describe('sendDigestEmail failures', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    send.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not put the recipient address in the error', async () => {
    const err = await failureFor('Domain is not verified');
    expect(err.message).toBe('Resend error sending digest: Domain is not verified');
    expect(err.message).not.toContain(RECIPIENT);
  });

  it('redacts an address that Resend echoes back in its own message', async () => {
    const err = await failureFor(`The to address ${RECIPIENT} is invalid`);
    expect(err.message).toBe('Resend error sending digest: The to address [redacted-email] is invalid');
  });

  it('still passes the address to Resend as the recipient', async () => {
    send.mockResolvedValue({ error: null });
    const { sendDigestEmail } = await import('./email');
    await sendDigestEmail(RECIPIENT, [tournament], 'https://example.com/unsub');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: RECIPIENT }));
  });
});
