-- Unsubscribe token for one-click, no-login email opt-out.
--
-- Adds /player/unsubscribe/[token], a public route that looks a
-- player up by this token and sets notify_frequency = 'off' without
-- requiring a session. The digest job (issue #119) links to that route from
-- the digest email as /player/unsubscribe/{unsubscribe_token}, so the
-- column name and shape here are load-bearing for that template.
--
-- not null default gen_random_uuid() means the column backfills itself for
-- every existing row the moment it is added, no separate backfill statement
-- needed. gen_random_uuid() is pgcrypto, already relied on implicitly by
-- every Supabase project (auth.users ids use it), so no `create extension`
-- is needed here.
alter table public.players
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

-- Enforced as a separate step, guarded by an existence check, so rerunning
-- this migration (the add column above is already a no-op on a second run)
-- does not also try to recreate the constraint and fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'players_unsubscribe_token_key'
  ) then
    alter table public.players
      add constraint players_unsubscribe_token_key unique (unsubscribe_token);
  end if;
end $$;

-- No RLS change needed and none was made. The unsubscribe route reads and
-- writes this column through a service-role client (bypasses RLS by design,
-- see lib/supabase-server.ts unsubscribeByToken) because the visitor is
-- identified by the token in the URL, not by a session, so there is no
-- auth.uid() for a policy to check. That is a separate access path from the
-- anon-key one the existing players_select_own, players_update_own,
-- players_insert_own and players_delete_admin policies govern (measured
-- 2026-08-22, see supabase/README.md), and this column does not change what
-- any of those four allow: a player can still only read or update their own
-- row, and unsubscribe_token is just one more column on that row. The
-- service-role key used by the unsubscribe route is never exposed to the
-- browser.
