import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clientAddress, createRateLimiter, parseSubmission, PENDING_STATUS } from '@/lib/submissions';

// Submissions from organizers whose event is not on Chess-Results.com (issue #238). This is the
// first unauthenticated write path into `tournaments`, so it is deliberately narrow: it only ever
// inserts a `pending` row (invisible to every public read until a person publishes it), it
// validates every field, and it has three guards against abuse: a hidden honeypot field, a
// per-address limit, and a cap on how many submissions can be waiting for review at once.
const PER_ADDRESS_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;
export const MAX_PENDING = 100;

const limiter = createRateLimiter(PER_ADDRESS_LIMIT, WINDOW_MS);

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: NextRequest) {
  limiter.sweep();
  if (!limiter.take(clientAddress(request.headers))) {
    return NextResponse.json(
      { error: 'Too many submissions from this address. Try again in an hour.' },
      { status: 429, headers: { 'Retry-After': String(WINDOW_MS / 1000) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseSubmission(body, new Date().toISOString().slice(0, 10));
  if (!parsed.ok && parsed.spam) {
    // Looks like success, writes nothing.
    return NextResponse.json({ status: 'received' }, { status: 201 });
  }
  if (!parsed.ok) {
    return NextResponse.json({ error: 'Check the highlighted fields.', errors: parsed.errors }, { status: 400 });
  }

  const supabase = serviceClient();
  if (!supabase) {
    console.error('[submit] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
    return NextResponse.json({ error: 'Submissions are not available right now.' }, { status: 503 });
  }

  const { count, error: countError } = await supabase
    .from('tournaments')
    .select('id', { count: 'exact', head: true })
    .eq('status', PENDING_STATUS);
  if (countError) {
    console.error('[submit] pending count failed:', countError.message);
    return NextResponse.json({ error: 'Could not save your submission.' }, { status: 500 });
  }
  if ((count ?? 0) >= MAX_PENDING) {
    return NextResponse.json(
      { error: 'Too many submissions are waiting for review. Please try again later.' },
      { status: 503 }
    );
  }

  const id = `sub_${randomUUID()}`;
  const { error } = await supabase.from('tournaments').insert({ id, ...parsed.row });
  if (error) {
    console.error('[submit] insert failed:', error.message);
    return NextResponse.json({ error: 'Could not save your submission.' }, { status: 500 });
  }

  return NextResponse.json({ id, status: PENDING_STATUS }, { status: 201 });
}
