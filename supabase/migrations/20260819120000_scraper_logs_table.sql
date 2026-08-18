-- scraper_logs never made it into version control (see supabase/README.md),
-- and was apparently never created in the dashboard either: DataFreshness.tsx,
-- /status, and /api/scraper-last-success all query it and get a 404. This
-- creates it against the columns those callers and scripts/scrape.ts /
-- app/api/cron/scrape-tournaments already assume exist.
--
-- Only server code (service role key, bypasses RLS) ever inserts. The client
-- components (DataFreshness, /status) read with the anon key, so RLS is
-- enabled with a public select-only policy: readable by anyone, writable by
-- no one holding just the anon key.

create table if not exists public.scraper_logs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('running', 'success', 'completed', 'failed')),
  message text,
  tournaments_found integer,
  tournaments_added integer
);

create index if not exists scraper_logs_status_completed_at_idx
  on public.scraper_logs (status, completed_at desc);

alter table public.scraper_logs enable row level security;

create policy "scraper_logs are publicly readable"
  on public.scraper_logs for select
  to anon, authenticated
  using (true);
