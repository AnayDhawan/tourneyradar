-- Row Level Security for player-owned tables.
--
-- Background: player_favorite_tournaments was reachable with the anon key and
-- filtered only by a client-supplied player_id, both through /api/wishlist and
-- directly from app/player/wishlist/page.tsx. The route now derives the player
-- from a verified bearer token, but the browser still queries this table with
-- the anon key, so the database itself has to enforce ownership.
--
-- Ownership chain: auth.users.id -> players.auth_user_id -> players.id
--                  -> player_favorite_tournaments.player_id
--
-- APPLY WITH CARE. Enabling RLS denies everything not explicitly permitted.
-- Run against a branch or staging project first and confirm the wishlist page
-- still loads for a signed-in player before applying to production.

-- Resolves the players.id belonging to the current JWT. SECURITY DEFINER so the
-- lookup itself is not subject to the players policies below, which would
-- otherwise recurse. STABLE so Postgres can cache it per statement.
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
grant execute on function public.current_player_id() to authenticated;

-- players ---------------------------------------------------------------

alter table public.players enable row level security;

drop policy if exists "players read own row" on public.players;
create policy "players read own row"
  on public.players
  for select
  using (auth_user_id = auth.uid());

drop policy if exists "players update own row" on public.players;
create policy "players update own row"
  on public.players
  for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Registration inserts the row immediately after sign-up, so the new user must
-- be allowed to create exactly one row pointing at themselves.
drop policy if exists "players insert own row" on public.players;
create policy "players insert own row"
  on public.players
  for insert
  with check (auth_user_id = auth.uid());

-- player_favorite_tournaments -------------------------------------------

alter table public.player_favorite_tournaments enable row level security;

drop policy if exists "wishlist read own" on public.player_favorite_tournaments;
create policy "wishlist read own"
  on public.player_favorite_tournaments
  for select
  using (player_id = public.current_player_id());

drop policy if exists "wishlist insert own" on public.player_favorite_tournaments;
create policy "wishlist insert own"
  on public.player_favorite_tournaments
  for insert
  with check (player_id = public.current_player_id());

drop policy if exists "wishlist delete own" on public.player_favorite_tournaments;
create policy "wishlist delete own"
  on public.player_favorite_tournaments
  for delete
  using (player_id = public.current_player_id());

-- Anonymous callers get nothing on either table. Tournaments stay public and
-- are deliberately untouched here.
revoke all on public.player_favorite_tournaments from anon;
revoke all on public.players from anon;
