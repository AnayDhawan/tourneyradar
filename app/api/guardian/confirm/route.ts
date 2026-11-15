import { NextRequest, NextResponse } from 'next/server';
import { confirmGuardianToken } from '@/lib/guardian-consent-server';
import { redactEmails } from '@/lib/redact';

// Public by design: the guardian is not a TourneyRadar user and arrives from an
// emailed link. The 256-bit token is the credential. POST rather than GET so a
// mail scanner that fetches every link in a message cannot confirm for them.
const MAX_TOKEN_LENGTH = 200;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token = (body as { token?: unknown })?.token;
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) {
    return NextResponse.json({ error: 'Link not recognized' }, { status: 400 });
  }

  try {
    const result = await confirmGuardianToken(token);
    if (result === 'invalid') {
      return NextResponse.json({ error: 'Link not recognized' }, { status: 400 });
    }
    if (result === 'expired') {
      return NextResponse.json(
        { error: 'This link has expired. Ask the account holder to send a new one.' },
        { status: 410 }
      );
    }
    return NextResponse.json({ status: 'confirmed' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(
      'Guardian confirmation failed:',
      redactEmails(error instanceof Error ? error.message : String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
