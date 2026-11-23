import { NextRequest, NextResponse } from 'next/server';
import { redactEmails } from '@/lib/redact';
import { deletePlayerAccount, getAuthenticatedPlayer } from '@/lib/supabase-server';

// The player id comes from the verified access token only. Nothing in the URL
// or body can point this at another account.
const UNAUTHORIZED = { error: 'Authentication required' };

function describe(error: unknown): string {
  return redactEmails(error instanceof Error ? error.message : String(error));
}

export async function DELETE(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if ((body as { confirm?: unknown })?.confirm !== true) {
    return NextResponse.json({ error: 'confirm must be true' }, { status: 400 });
  }

  try {
    await deletePlayerAccount({ playerId: player.playerId, authUserId: player.authUserId });
  } catch (error) {
    console.error('Account deletion failed:', describe(error));
    return NextResponse.json(
      { error: 'Deleting your account failed part way. Email us and we will finish it.' },
      { status: 500 }
    );
  }

  // Logged without the email or any identifier of the person.
  console.info('Account deletion completed');
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
