-- Access changes found by supabase/audit/rls_audit.sql against the live project.
--
-- Already applied by hand in the SQL editor on 2026-11-08. This file records
-- them so the repo matches the database, and every statement can run again.
--
-- 1. tournaments_published_read also hid unpublished rows from their organizer
--    and from admins, who can still update and delete those rows. Reading now
--    follows the same rule as tournaments_update_own.
--
-- 2. tournament_history stored every version of every row and anyone could read
--    it, including rows hidden as 'duplicate' or 'invalid_date'. Nothing in the
--    app reads it with the anon key, so the public policy is gone. Writes come
--    from a security definer trigger and are unaffected.
--
-- 3. organizers_insert_public allowed any account to create an organizer row
--    for itself, and tournaments_insert_organizer then let it publish tournaments
--    with any status. Only admins can create organizers now.
--
-- 4. record_api_key_use could be called by anyone. Only the API, which uses the
--    service role, needs it.

begin;

drop policy if exists tournaments_staff_read on public.tournaments;
create policy tournaments_staff_read on public.tournaments
  for select to authenticated
  using (
    organizer_id in (select organizers.id from public.organizers where organizers.auth_user_id = auth.uid())
    or exists (select 1 from public.admins where admins.auth_user_id = auth.uid())
  );

drop policy if exists "tournament_history is publicly readable" on public.tournament_history;

drop policy if exists organizers_insert_public on public.organizers;
drop policy if exists organizers_insert_admin on public.organizers;
create policy organizers_insert_admin on public.organizers
  for insert to authenticated
  with check (exists (select 1 from public.admins where admins.auth_user_id = auth.uid()));

revoke all on function public.record_api_key_use(uuid) from public, anon, authenticated;
grant execute on function public.record_api_key_use(uuid) to service_role;

commit;
