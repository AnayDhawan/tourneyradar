import { NextRequest, NextResponse } from 'next/server';
import { sendGuardianConsentEmail } from '@/lib/email';
import {
  GUARDIAN_MAX_SENDS,
  deriveStatus,
  isAgeBasis,
  maskEmail,
  normalizeEmail,
  resendWaitMinutes,
  type AgeCheckRow,
} from '@/lib/guardian-consent';
import { getAgeCheck, issueGuardianToken, recordAgeBasis } from '@/lib/guardian-consent-server';
import { redactEmails } from '@/lib/redact';
import { getAuthenticatedPlayer } from '@/lib/supabase-server';

// The player comes from the verified access token only. Nothing in the body can
// point this at another account.
const UNAUTHORIZED = { error: 'Authentication required' };
const NO_STORE = { 'Cache-Control': 'private, no-store' };
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tourneyradar.com';

function describe(error: unknown): string {
  return redactEmails(error instanceof Error ? error.message : String(error));
}

function payload(row: AgeCheckRow | null) {
  return {
    status: deriveStatus(row),
    guardianEmail: maskEmail(row?.guardian_email ?? null),
    confirmedAt: row?.guardian_confirmed_at ?? null,
  };
}

export async function GET(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  try {
    return NextResponse.json(payload(await getAgeCheck(player.playerId)), { headers: NO_STORE });
  } catch (error) {
    console.error('Age check read failed:', describe(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Records the age answer for an account that has none, and (re)sends the
 * guardian link for an under-16 account that is not confirmed yet.
 *
 * Body: { age_basis, guardian_email? }. For an existing under-16 account the
 * email may be left out to resend to the address on file.
 */
export async function POST(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { age_basis: basis, guardian_email: rawEmail } = (body ?? {}) as Record<string, unknown>;
  if (!isAgeBasis(basis)) {
    return NextResponse.json({ error: 'age_basis is not valid' }, { status: 400 });
  }

  try {
    let row = await getAgeCheck(player.playerId);

    // The answer is given once. Moving from "under 16" to "16 or older" would
    // be a way round the check, so it needs a person, not this endpoint.
    if (row && row.age_basis !== basis) {
      return NextResponse.json({ error: 'Your age answer is already recorded' }, { status: 409 });
    }

    if (basis === '16_or_older') {
      if (!row) {
        await recordAgeBasis(player.playerId, basis, null);
        row = await getAgeCheck(player.playerId);
      }
      return NextResponse.json(payload(row), { headers: NO_STORE });
    }

    if (row?.guardian_confirmed_at) {
      return NextResponse.json(payload(row), { headers: NO_STORE });
    }

    const guardianEmail =
      rawEmail === undefined || rawEmail === null || rawEmail === ''
        ? row?.guardian_email ?? null
        : normalizeEmail(rawEmail);
    if (!guardianEmail) {
      return NextResponse.json({ error: 'Enter a valid parent or guardian email' }, { status: 400 });
    }
    // Read as the caller, so RLS applies. Needed for the email text and for the
    // check below.
    const { data: profile } = await player.supabase
      .from('players')
      .select('name, email')
      .eq('id', player.playerId)
      .maybeSingle();

    // Reasonable efforts means a second person, not the child's own inbox.
    if (profile?.email && guardianEmail === profile.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Use your parent or guardian's email, not your own" },
        { status: 400 }
      );
    }

    if (!row) {
      await recordAgeBasis(player.playerId, basis, guardianEmail);
      row = await getAgeCheck(player.playerId);
    }

    const wait = resendWaitMinutes(row);
    if (wait > 0) {
      return NextResponse.json(
        { error: `A link was sent a moment ago. Try again in ${wait} minute${wait === 1 ? '' : 's'}.` },
        { status: 429, headers: { 'Retry-After': String(wait * 60) } }
      );
    }
    if ((row?.guardian_send_count ?? 0) >= GUARDIAN_MAX_SENDS) {
      return NextResponse.json(
        { error: 'Too many links have been sent. Email dhawansanay@gmail.com for help.' },
        { status: 429 }
      );
    }

    const token = await issueGuardianToken(
      player.playerId,
      guardianEmail,
      row?.guardian_send_count ?? 0
    );
    try {
      await sendGuardianConsentEmail(
        guardianEmail,
        profile?.name || 'A TourneyRadar player',
        `${SITE_URL}/guardian/confirm?token=${encodeURIComponent(token)}`
      );
    } catch (error) {
      console.error('Guardian email failed:', describe(error));
      return NextResponse.json(
        { error: 'We could not send the email. Check the address and try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json(payload(await getAgeCheck(player.playerId)), { headers: NO_STORE });
  } catch (error) {
    console.error('Age check failed:', describe(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
