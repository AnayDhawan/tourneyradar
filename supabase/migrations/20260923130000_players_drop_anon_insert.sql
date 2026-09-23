-- Phase 3 of removing the orphaned-signup window (issue #177).
--
-- Do not apply this until phase 2 is applied AND the client has stopped
-- inserting into players. Applying it while the client still inserts breaks
-- registration outright.
--
-- With the trigger creating the row, nothing anonymous needs to write to
-- players any more, so the compromise that made anonymous insert possible can
-- go. That compromise was:
--
--   players_insert_own allowed an insert with auth.uid() IS NULL as long as
--   is_claimable_auth_user() said the target account was created in the last
--   five minutes and had no profile yet. It was correct and carefully
--   reasoned, and it existed only because the client had to write the row
--   before the user had a session. It is also what produced the cryptic RLS
--   error in #170 once that window passed.
--
-- After this, the policy is one rule with no time window and no definer
-- function: you may insert your own row, or you are an admin.

begin;

drop policy if exists players_insert_own on public.players;

create policy players_insert_own
  on public.players
  for insert
  to authenticated
  with check (
    auth_user_id = auth.uid()
    or exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
  );

-- anon can no longer write to players at all. The trigger runs as the
-- definer inside the auth insert, so it is unaffected.
revoke insert on public.players from anon;

-- Nothing references it once the policy above is in place. Dropped rather
-- than left behind, so it cannot quietly become reachable again.
drop function if exists public.is_claimable_auth_user(uuid);

commit;
