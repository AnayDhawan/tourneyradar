-- Close the anonymous insert hole on public.players.
--
-- Measured 2026-08-22: `players_insert_public` was `for insert to public with
-- check (true)`, so anyone holding the anon key, which ships in the client
-- bundle, could create unlimited arbitrary rows in players. Verified by
-- inserting one with the public key and deleting it again. The FK to auth.users
-- stops a fabricated auth_user_id but would not stop one belonging to a real
-- auth user, so it was not acting as a control.
--
-- The other three policies measured on the same day are correct and are left
-- alone: players_select_own and players_update_own scope to the owning user or
-- an admin, and players_delete_admin is admin only. players_update_own has a
-- null WITH CHECK, which Postgres fills from USING, so it cannot be used to
-- reassign a row to another user.
--
-- This replaces only the insert policy. It deliberately does NOT run the
-- `revoke all on public.players from anon` from 20260729120000, which was
-- written for an empty table and would risk registration for real users.

begin;

-- app/player/register/page.tsx calls supabase.auth.signUp() and then inserts
-- the profile row immediately. On a project that requires email confirmation,
-- signUp returns a user but no session, so the client is still anonymous at
-- insert time and auth.uid() is null. A strict `auth_user_id = auth.uid()`
-- alone would therefore break registration outright.
--
-- SECURITY DEFINER matters here beyond convenience: anon has no read access to
-- auth.users, so testing this condition inline inside the policy would raise
-- permission denied and fail every registration. STABLE so the planner can
-- cache it per statement. Empty search_path with fully qualified names is the
-- standard hardening for a definer function.
create or replace function public.is_claimable_auth_user(candidate uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1
           from auth.users u
           where u.id = candidate
             and u.created_at > now() - interval '5 minutes'
         )
     and not exists (
           select 1
           from public.players p
           where p.auth_user_id = candidate
         )
$$;

revoke all on function public.is_claimable_auth_user(uuid) from public;
grant execute on function public.is_claimable_auth_user(uuid) to anon, authenticated;

-- Dropped, not narrowed. Policies OR together, so adding a stricter insert
-- policy alongside a `with check (true)` one would have changed nothing.
drop policy if exists players_insert_public on public.players;

create policy players_insert_own
  on public.players
  for insert
  to anon, authenticated
  with check (
    (auth.uid() is not null and auth_user_id = auth.uid())
    or (
      auth.uid() is null
      and auth_user_id is not null
      and public.is_claimable_auth_user(auth_user_id)
    )
    or exists (
      select 1 from public.admins a where a.auth_user_id = auth.uid()
    )
  );

commit;
