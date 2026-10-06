-- Fix two broken insert policies.
--
-- 1. feedback: "anyone can submit feedback" subqueries public.players. anon has
--    no privileges on players (revoked in 20260729120000, insert revoked in
--    20260923130000), and Postgres checks table privileges when the policy
--    expression is planned, not when the OR short-circuits. Every anon insert,
--    including ones with player_id null, failed with
--    42501 "permission denied for table players" (surfaced as HTTP 401).
--
-- 2. docs: inside the count subquery, `d.author_player_id = author_player_id`
--    resolves the right-hand side to d's own column, so it is always true. The
--    2-per-week cap counted every user's docs, not the author's.
--
-- Both are fixed with SECURITY DEFINER helpers: empty search_path, fully
-- qualified names, execute granted only to the roles that need it.

begin;

create or replace function public.owns_player(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.players p
    where p.id = pid and p.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.owns_player(uuid) from public;
grant execute on function public.owns_player(uuid) to anon, authenticated;

create or replace function public.docs_published_last_week(pid uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.docs d
  where d.author_player_id = pid
    and d.created_at > now() - interval '7 days';
$$;

revoke all on function public.docs_published_last_week(uuid) from public;
grant execute on function public.docs_published_last_week(uuid) to authenticated;

drop policy if exists "anyone can submit feedback" on public.feedback;
create policy "anyone can submit feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (
    player_id is null
    or public.owns_player(player_id)
  );

drop policy if exists "players can publish up to 2 docs per week" on public.docs;
create policy "players can publish up to 2 docs per week"
  on public.docs for insert
  to authenticated
  with check (
    author_type = 'user'
    and public.owns_player(author_player_id)
    and public.docs_published_last_week(author_player_id) < 2
  );

commit;
