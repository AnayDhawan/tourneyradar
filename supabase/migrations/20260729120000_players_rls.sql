-- ⚠️ DO NOT APPLY THIS FILE AS-IS. Superseded in part; see supabase/README.md
-- "Measured state, 2026-08-22".
--
-- This migration was written against an empty `players` table with no policies
-- on it. Neither is true any more: there are 29 real rows, and RLS was turned
-- on through the dashboard with policies whose names are not known here. This
-- file was never applied (`current_player_id()` does not exist on the live
-- project), so applying it now would:
--
--   1. add policies alongside the existing unknown ones. Policies OR together,
--      so this can only widen access, never narrow it. The comment below about
--      not touching `player_favorite_tournaments` for exactly this reason now
--      applies to `players` too.
--   2. run `revoke all on public.players from anon`, changing grants that
--      currently work, which risks breaking registration for real users.
--
-- Its select/update/delete policies are also redundant: those three are already
-- blocked, verified 2026-08-22. The part still worth having is the INSERT
-- policy, because anon insert is currently unrestricted. Landing that means
-- dropping the existing permissive insert policy by name first.
--
-- Update 2026-08-22: that has now been done, in
-- 20260822120000_players_insert_policy.sql, which drops players_insert_public
-- and replaces it. Nothing in this file is outstanding any more. Keep it for
-- the reasoning in the comments; do not run it.

-- Row Level Security for the players table.
--
-- Measured state on 2026-07-29, probed with the public anon key:
--
--   player_favorite_tournaments  RLS enabled and enforcing.
--     An anonymous insert returns 42501, "new row violates row-level
--     security policy". Deliberately not touched by this migration: adding
--     more permissive policies alongside the existing ones would OR
--     together and could only widen access.
--
--   players                      RLS NOT enforcing.
--     An anonymous insert reaches the NOT NULL constraint on email (23502)
--     rather than being rejected by a policy, which means no policy stood
--     in the way. The table currently returns zero rows, so nothing has
--     been disclosed yet, but the moment anyone registers their email,
--     phone, fide_id and rating become readable by anyone.
--
-- The anon key is public by design. It ships in the client bundle at
-- tourneyradar.com, so it is not a secret and cannot be made one. RLS is
-- the only access control on these tables.

-- Maps the current JWT to a players.id. SECURITY DEFINER so the lookup is
-- not itself subject to the policies below, which would recurse. STABLE so
-- the planner can cache it per statement.
create or replace function public.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.players where auth_user_id = auth.uid()
$$;

revoke all on function public.current_player_id() from public;
grant execute on function public.current_player_id() to authenticated, anon;

alter table public.players enable row level security;

-- Reads are the part that actually matters here: this table holds email,
-- phone, fide_id and rating. Only the owning user may see their row.
drop policy if exists "players read own row" on public.players;
create policy "players read own row"
  on public.players
  for select
  to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "players update own row" on public.players;
create policy "players update own row"
  on public.players
  for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists "players delete own row" on public.players;
create policy "players delete own row"
  on public.players
  for delete
  to authenticated
  using (auth_user_id = auth.uid());

-- INSERT is the awkward one. app/player/register/page.tsx calls
-- supabase.auth.signUp() and then immediately inserts the profile row. If
-- the project requires email confirmation, signUp returns a user but no
-- session, so the client is still anonymous at insert time and auth.uid()
-- is null.
--
-- A strict `with check (auth_user_id = auth.uid())` would therefore break
-- registration outright on a confirm-email project. This policy allows the
-- authenticated case strictly, and allows the anonymous case only when the
-- claimed auth_user_id belongs to a real, very recently created auth user.
-- That keeps registration working without letting anyone write arbitrary
-- rows against someone else's account.
--
-- See supabase/README.md for the better long-term fix.
drop policy if exists "players insert own row" on public.players;
create policy "players insert own row"
  on public.players
  for insert
  to authenticated, anon
  with check (
    (auth.uid() is not null and auth_user_id = auth.uid())
    or (
      auth.uid() is null
      and exists (
        select 1
        from auth.users u
        where u.id = auth_user_id
          and u.created_at > now() - interval '5 minutes'
      )
      and not exists (
        select 1 from public.players p where p.auth_user_id = players.auth_user_id
      )
    )
  );

-- Anonymous callers get no direct table privileges. The insert policy above
-- still applies to the anon role through the grant below, which is scoped to
-- insert only.
revoke all on public.players from anon;
grant insert on public.players to anon;

-- tournaments stays public and is deliberately untouched.
