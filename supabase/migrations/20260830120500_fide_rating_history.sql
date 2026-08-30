-- Issue #128: FIDE rating trajectory analytics.
--
-- FIDE has no official public REST API. The rating history behind a
-- ratings.fide.com profile page's own trend chart comes from an internal,
-- undocumented endpoint (`POST /a_chart_data.phtml?event={fideId}&period={n}`,
-- see lib/fide.ts for how it was found and verified) that FIDE can rename,
-- restructure, or block at any time without notice. This table exists so a
-- dashboard render never depends on that endpoint being up: it caches the
-- last successful pull, keyed by fide_id + period label, and app code only
-- calls out to FIDE live when the cache for a given fide_id is missing or
-- older than 24h (see app/api/player/fide-rating/route.ts).
--
-- Ratings are per calendar-month FIDE rating list periods (e.g. "2026-Jan"),
-- not arbitrary dates, so `period` is stored as FIDE's own label (text)
-- rather than a date column.
--
-- player_id is nullable and set on delete set null: the row's usefulness is
-- keyed by fide_id (the same FIDE history is valid for anyone who cites that
-- ID), so losing the player association on account deletion should not force
-- deleting rows that are still good, reusable cache entries.

create table if not exists public.fide_rating_history (
  id bigint generated always as identity primary key,
  player_id uuid references public.players(id) on delete set null,
  fide_id text not null,
  period text not null,
  standard integer,
  rapid integer,
  blitz integer,
  fetched_at timestamptz not null default now()
);

-- One row per (fide_id, period): refreshing overwrites that month's numbers
-- rather than accumulating duplicate history rows.
create unique index if not exists fide_rating_history_fide_id_period_idx
  on public.fide_rating_history (fide_id, period);

create index if not exists fide_rating_history_player_id_idx
  on public.fide_rating_history (player_id);

alter table public.fide_rating_history enable row level security;

-- Public-read, matching the existing scraper_logs pattern (supabase/README.md,
-- 20260819120000_scraper_logs_table.sql): this data is a cache of FIDE's own
-- public ratings site, not private player data, so there is nothing gained by
-- scoping reads to the owning player. No insert/update/delete policy is
-- granted to anon or authenticated, so writes only succeed with the service
-- role key, which is what app/api/player/fide-rating/route.ts uses.
create policy "fide_rating_history is publicly readable"
  on public.fide_rating_history for select
  to anon, authenticated
  using (true);
