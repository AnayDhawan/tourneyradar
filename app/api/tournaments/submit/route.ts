import { NextRequest, NextResponse } from 'next/server';
import { redactEmails } from '@/lib/redact';
import { getAuthenticatedPlayer } from '@/lib/supabase-server';
import {
  MAX_PENDING_PER_PLAYER,
  MAX_SUBMISSIONS_PER_DAY,
  validateSubmission,
} from '@/lib/tournament-submission';
import { countSubmissions, createSubmission } from '@/lib/tournament-submission-server';

// Organizer self-submission (issue #238). The submission lands as a 'pending'
// tournament that nobody can read until a moderator publishes it.
//
// Spam guard, in order: a signed-in player (the id comes from the verified
// token, never the body), a hidden field real people leave empty, a cap per day
// and a cap on unreviewed rows.
const UNAUTHORIZED = { error: 'Log in to submit a tournament' };
const MAX_BODY_BYTES = 8 * 1024;

function describe(error: unknown): string {
  return redactEmails(error instanceof Error ? error.message : String(error));
}

export async function POST(request: NextRequest) {
  const player = await getAuthenticatedPlayer(request);
  if (!player) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request is too large' }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // The form hides this field. A bot that fills every input fills it too, and
  // gets the same answer a real submission would, so it learns nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const result = validateSubmission(body);
  if (!result.ok) {
    return NextResponse.json({ error: 'Check the form', fields: result.errors }, { status: 400 });
  }

  try {
    const counts = await countSubmissions(player.playerId);
    if (counts.today >= MAX_SUBMISSIONS_PER_DAY) {
      return NextResponse.json(
        { error: `You can submit ${MAX_SUBMISSIONS_PER_DAY} tournaments a day. Try again tomorrow.` },
        { status: 429 }
      );
    }
    if (counts.pending >= MAX_PENDING_PER_PLAYER) {
      return NextResponse.json(
        { error: 'You have several submissions waiting for review. We will look at them first.' },
        { status: 429 }
      );
    }

    await createSubmission(player.playerId, result.value);
    return NextResponse.json({ success: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Tournament submission failed:', describe(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
