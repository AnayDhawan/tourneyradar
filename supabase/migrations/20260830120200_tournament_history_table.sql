-- Append-only history layer for `tournaments` (issue #125).
--
-- Problem: scripts/scrape.ts pushTournaments() upserts onto `tournaments`
-- with onConflict: 'id'. That table is current-state only, so every
-- re-scrape overwrites the previous row in place. Once a tournament's date
-- passes, scrape.ts's own past-tournament filter (~line 351: `if
-- (dates.start < today) return null`) stops that id from ever being
-- scraped again, so whatever the row looked like at the last successful
-- upsert is the last version that will ever exist. Nothing before that
-- final overwrite is recoverable.
--
-- Trigger vs. application-level write: picked the trigger (option a).
-- `tournaments` has a second writer this repo doesn't control: per
-- CONTRIBUTING.md:18, "The admin panel is not open source", and it writes
-- to `tournaments` directly. An application-level change confined to
-- scripts/scrape.ts would only capture the scraper's writes and silently
-- miss every admin-panel edit, which defeats the point of a history layer
-- that's supposed to mean "every version of a row is preserved." A
-- database trigger fires on every INSERT/UPDATE regardless of which
-- process performed it, so it's the only option that actually covers both
-- writers without needing (or trusting) a change to the closed-source
-- admin panel. It also means scripts/scrape.ts needs zero changes here.
--
-- Snapshot shape: single jsonb column of the full new row (to_jsonb(new))
-- rather than one column per tournament field. `tournaments` was created
-- through the Supabase dashboard and was never in version control (see
-- supabase/README.md), so its exact column set is reconstructed here from
-- scripts/scrape.ts's upsert payload (~line 494) rather than from a DDL
-- record. A columnar mirror would have to be kept in lockstep with that
-- table by hand and would silently drop any future column until this
-- migration's copy caught up; jsonb just captures whatever the row
-- actually was, in full, forever. RLS below only needs to read
-- `tournament_id` and `recorded_at`, neither of which needs its own
-- column for that.
--
-- RLS: same shape as scraper_logs (supabase/migrations/20260819120000) --
-- public select-only. Nothing inserts through the anon or authenticated
-- role at all: the trigger function below runs `security definer`, so it
-- writes as its owner regardless of who performed the INSERT/UPDATE on
-- `tournaments`, and no INSERT/UPDATE/DELETE policy is defined for any
-- other role. That means even the service role key doesn't need a policy
-- to write here today, and if something other than the trigger ever tries
-- to write directly, RLS blocks it by default (deny unless a policy
-- explicitly allows it) rather than by omission.

create table if not exists public.tournament_history (
  id bigint generated always as identity primary key,
  tournament_id text not null,
  recorded_at timestamptz not null default now(),
  snapshot jsonb not null
);

create index if not exists tournament_history_tournament_id_recorded_at_idx
  on public.tournament_history (tournament_id, recorded_at desc);

alter table public.tournament_history enable row level security;

drop policy if exists "tournament_history is publicly readable" on public.tournament_history;
create policy "tournament_history is publicly readable"
  on public.tournament_history for select
  to anon, authenticated
  using (true);

-- security definer so it can write to tournament_history regardless of
-- which role's write on `tournaments` fired it (scraper's service role,
-- or the closed-source admin panel's own credentials). search_path is
-- pinned per Supabase's documented security definer pattern (see
-- supabase/README.md's handle_new_user() example) so it can't be hijacked
-- by a caller-controlled search_path.
create or replace function public.record_tournament_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tournament_history (tournament_id, snapshot)
  values (new.id, to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists on_tournament_write_record_history on public.tournaments;
create trigger on_tournament_write_record_history
  after insert or update on public.tournaments
  for each row execute function public.record_tournament_history();
