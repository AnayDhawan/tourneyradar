import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-server';
import { listPendingSubmissions } from '@/lib/moderation-server';
import { redactEmails } from '@/lib/redact';

// Moderation queue (issue #263). Admin only: authorizeAdmin runs before anything
// else, and the pending rows are read with the service role on the server.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function describe(error: unknown): string {
  return redactEmails(error instanceof Error ? error.message : String(error));
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });

  try {
    const submissions = await listPendingSubmissions();
    return NextResponse.json({ submissions }, { headers: NO_STORE });
  } catch (error) {
    console.error('Listing submissions failed:', describe(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE });
  }
}
