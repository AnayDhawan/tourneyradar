import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-server';
import { parseModerationRequest } from '@/lib/moderation';
import { decideSubmission } from '@/lib/moderation-server';
import { redactEmails } from '@/lib/redact';

// Approve or reject one submission (issue #263). The admin gate runs first, so a
// caller who is not an admin learns nothing about whether the id exists.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_BODY_BYTES = 8 * 1024;
const ID_PATTERN = /^submitted_[0-9a-f-]{36}$/;

function describe(error: unknown): string {
  return redactEmails(error instanceof Error ? error.message : String(error));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });

  const { id } = await params;
  if (!ID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404, headers: NO_STORE });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request is too large' }, { status: 413, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE });
  }

  const parsed = parseModerationRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, fields: parsed.fields }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await decideSubmission(id, parsed.value, auth.authUserId);
    if (result.ok) {
      return NextResponse.json({ success: true, id: result.id, status: result.status }, { headers: NO_STORE });
    }
    if (result.kind === 'not_found') {
      return NextResponse.json({ error: result.error }, { status: 404, headers: NO_STORE });
    }
    if (result.kind === 'conflict') {
      return NextResponse.json({ error: result.error }, { status: 409, headers: NO_STORE });
    }
    return NextResponse.json({ error: result.error, fields: result.fields }, { status: 422, headers: NO_STORE });
  } catch (error) {
    console.error('Moderation decision failed:', describe(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE });
  }
}
