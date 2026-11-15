// Moderation for organizer submissions (issue #238).
//
//   npm run review:submissions                         list pending submissions
//   npm run review:submissions -- --approve <id>       geocode and publish
//   npm run review:submissions -- --approve <id> --lat 18.52 --lng 73.85
//   npm run review:submissions -- --reject <id> [--note "why"]
//
// Submitted rows are tournaments with status 'pending', invisible to visitors
// (tournaments_published_read). Approving sets coordinates, status 'published'
// and scraped_at (so the weekly digest picks the event up). Rejecting sets
// status 'rejected'; the row stays for the record.
//
// Look for a duplicate of the event from the scraper before approving. Nothing
// here checks for one.

import { createClient } from '@supabase/supabase-js';
import { geocodeSingleCity } from '../lib/geocoding';
import { redactEmails } from '../lib/redact';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: npm run review:submissions');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fail(message: string): never {
  console.error(redactEmails(message));
  process.exit(1);
}

async function list() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, date, end_date, city, country, category, fide_rated, external_link')
    .eq('source', 'organizer-submission')
    .eq('status', 'pending')
    .order('date', { ascending: true });
  if (error) fail(`Could not list submissions: ${error.message}`);

  if (!data?.length) {
    console.log('No pending submissions.');
    return;
  }
  for (const t of data) {
    console.log(`\n${t.id}\n  ${t.name}\n  ${t.date} to ${t.end_date}, ${t.city}, ${t.country}`);
    console.log(`  ${t.category}, FIDE rated: ${t.fide_rated ? 'yes' : 'no'}\n  ${t.external_link}`);
  }
  console.log(`\n${data.length} pending. Approve: --approve <id>   Reject: --reject <id>`);
}

async function finish(id: string, status: 'published' | 'rejected', extra: Record<string, unknown>, note?: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .update({ status, ...extra })
    .eq('id', id)
    .eq('source', 'organizer-submission')
    .eq('status', 'pending')
    .select('id');
  if (error) fail(`Could not update ${id}: ${error.message}`);
  if (!data?.length) fail(`${id} is not a pending submission.`);

  const { error: logError } = await supabase
    .from('tournament_submissions')
    .update({ reviewed_at: new Date().toISOString(), review_note: note ?? null })
    .eq('tournament_id', id);
  if (logError) fail(`${id} is ${status}, but recording the review failed: ${logError.message}`);
  console.log(`${id}: ${status}`);
}

async function approve(id: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('city, country')
    .eq('id', id)
    .eq('source', 'organizer-submission')
    .eq('status', 'pending')
    .maybeSingle();
  if (error) fail(`Could not read ${id}: ${error.message}`);
  if (!data) fail(`${id} is not a pending submission.`);

  let lat = arg('--lat') !== undefined ? Number(arg('--lat')) : NaN;
  let lng = arg('--lng') !== undefined ? Number(arg('--lng')) : NaN;
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    const found = await geocodeSingleCity(data.city, data.country);
    if (!found) fail(`Could not place "${data.city}, ${data.country}". Pass --lat and --lng.`);
    ({ lat, lng } = found);
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) fail('Coordinates are out of range.');

  await finish(id, 'published', { lat, lng, scraped_at: new Date().toISOString() }, arg('--note'));
}

async function main() {
  const approveId = arg('--approve');
  const rejectId = arg('--reject');
  if (approveId && rejectId) fail('Use either --approve or --reject, not both.');
  if (approveId) return approve(approveId);
  if (rejectId) return finish(rejectId, 'rejected', {}, arg('--note'));
  return list();
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
