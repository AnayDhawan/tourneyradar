-- Hardening found by supabase/tests/rls.test.mjs.
--
-- 1. docs: the 2-per-week cap counts rows with created_at > now() - 7 days, but
--    created_at is a client-writable column. A signed-in player could insert
--    with created_at = '2000-01-01' and never be counted, so the cap did
--    nothing. Timestamps are now set by the server for API roles.
--
-- 2. Trigger functions were callable by anon and authenticated. They are not
--    reachable through PostgREST rpc (Postgres refuses to run a trigger
--    function outside a trigger), but they carried the default EXECUTE grant to
--    PUBLIC and show up in Supabase's security advisor. Triggers do not check
--    EXECUTE at fire time, so signup and history keep working.
--
-- 3. record_tournament_history pinned search_path to public rather than empty,
--    unlike every other definer function here. Now empty and fully qualified.
--
-- 4. feedback and docs accepted unbounded text from the anon key. Limits are
--    added NOT VALID: they apply to every new or updated row without rescanning
--    existing ones, so this cannot fail on data already in the table.
--
-- Safe to apply to the live project. Nothing here narrows a path the app uses.

begin;

-- 1 -------------------------------------------------------------------------

-- SECURITY INVOKER on purpose: current_user is then the API role in play
-- (anon or authenticated under PostgREST), so service-role seeding and manual
-- dashboard edits can still set explicit timestamps.
create or replace function public.docs_set_server_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.created_at := now();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists docs_set_server_timestamps on public.docs;
create trigger docs_set_server_timestamps
  before insert on public.docs
  for each row execute function public.docs_set_server_timestamps();

-- 2 -------------------------------------------------------------------------

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_player_referral_code() from public, anon, authenticated;
revoke all on function public.generate_referral_code() from public, anon, authenticated;
revoke all on function public.record_tournament_history() from public, anon, authenticated;

-- 3 -------------------------------------------------------------------------

create or replace function public.record_tournament_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.tournament_history (tournament_id, snapshot)
  values (new.id, to_jsonb(new));
  return new;
end;
$$;

revoke all on function public.record_tournament_history() from public, anon, authenticated;

-- 4 -------------------------------------------------------------------------

alter table public.feedback
  drop constraint if exists feedback_comment_length,
  drop constraint if exists feedback_page_url_length;
alter table public.feedback
  add constraint feedback_comment_length check (char_length(comment) <= 4000) not valid,
  add constraint feedback_page_url_length check (char_length(page_url) <= 2048) not valid;

alter table public.docs
  drop constraint if exists docs_title_length,
  drop constraint if exists docs_summary_length,
  drop constraint if exists docs_content_length,
  drop constraint if exists docs_slug_length;
alter table public.docs
  add constraint docs_title_length check (char_length(title) <= 200) not valid,
  add constraint docs_summary_length check (char_length(summary) <= 500) not valid,
  add constraint docs_content_length check (char_length(content) <= 50000) not valid,
  add constraint docs_slug_length check (char_length(slug) <= 120) not valid;

commit;
