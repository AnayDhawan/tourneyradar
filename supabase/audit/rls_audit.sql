-- Read-only audit of the live project's access control. Changes nothing.
--
-- Paste into the Supabase dashboard SQL editor and run. The editor shows only
-- the last result set, so this is one query that returns every finding as a
-- row: (section, object, detail, flag). Rows flagged REVIEW need a human look;
-- everything else is context.
--
-- Why it exists: supabase/tests/rls.test.mjs proves the policies in
-- supabase/migrations behave, but admins, tournaments and the four players
-- policies were created in the dashboard and are only assumed there. This is
-- how to check the assumption against the real thing.

with
tbl as (
  select c.oid, c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forced
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
),
pol as (
  select * from pg_policies where schemaname = 'public'
)

-- 1. RLS on/off, policy count, and what each API role can do at the grant level.
select '1 tables' as section,
       t.relname as object,
       'rls=' || t.rls
         || ' policies=' || (select count(*) from pol where pol.tablename = t.relname)
         || ' anon=' || concat_ws(',',
              case when has_table_privilege('anon', t.oid, 'select') then 'S' end,
              case when has_table_privilege('anon', t.oid, 'insert') then 'I' end,
              case when has_table_privilege('anon', t.oid, 'update') then 'U' end,
              case when has_table_privilege('anon', t.oid, 'delete') then 'D' end)
         || ' authenticated=' || concat_ws(',',
              case when has_table_privilege('authenticated', t.oid, 'select') then 'S' end,
              case when has_table_privilege('authenticated', t.oid, 'insert') then 'I' end,
              case when has_table_privilege('authenticated', t.oid, 'update') then 'U' end,
              case when has_table_privilege('authenticated', t.oid, 'delete') then 'D' end) as detail,
       case
         when not t.rls then 'REVIEW: RLS OFF, world-readable and writable with the anon key'
         when not exists (select 1 from pol where pol.tablename = t.relname)
           then 'note: RLS on, no policies, so only service_role can touch it'
       end as flag
  from tbl t

union all
-- 2. Every policy, verbatim.
select '2 policies',
       p.tablename || '.' || p.policyname,
       p.cmd || ' to ' || array_to_string(p.roles, ',')
         || ' using(' || coalesce(p.qual, '-') || ')'
         || ' check(' || coalesce(p.with_check, '-') || ')',
       case
         when p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
              and p.roles && array['public', 'anon', 'authenticated']::name[]
              and (p.qual = 'true' or p.with_check = 'true')
           then 'REVIEW: write policy with a true predicate'
         when p.cmd = 'SELECT' and p.qual = 'true'
              and p.tablename not in ('tournaments', 'scraper_logs', 'tournament_history',
                                      'fide_rating_history', 'docs')
           then 'REVIEW: public read on a table not expected to be public'
         when p.cmd in ('UPDATE', 'ALL') and p.with_check is null
           then 'note: null WITH CHECK, Postgres reuses USING'
       end
  from pol p

union all
-- 3. SECURITY DEFINER functions: who can run them and whether search_path is pinned.
select '3 definer functions',
       p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
       'search_path=' || coalesce((select c from unnest(p.proconfig) c where c like 'search_path=%'), 'UNSET')
         || ' anon_exec=' || has_function_privilege('anon', p.oid, 'execute')
         || ' authenticated_exec=' || has_function_privilege('authenticated', p.oid, 'execute'),
       case
         when not coalesce(p.proconfig @> array['search_path=""'], false)
           then 'REVIEW: search_path not pinned to empty'
         when has_function_privilege('anon', p.oid, 'execute') and p.proname <> 'owns_player'
           then 'REVIEW: anon can execute a definer function'
       end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef

union all
-- 4. Views bypass RLS unless security_invoker is set (Postgres 15+).
select '4 views',
       c.relname,
       coalesce(c.reloptions::text, 'no options'),
       case when not coalesce(c.reloptions @> array['security_invoker=true'], false)
            then 'REVIEW: view runs as its owner and ignores RLS on the tables under it'
       end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('v', 'm')

union all
-- 5. Expected state after every migration in the repo is applied. Each row says
--    what a correct project looks like; the flag fires when the live one differs.
select '5 migration drift', x.object, x.detail,
       case when x.bad then 'REVIEW: ' || x.expect end
  from (values
    ('trigger on_auth_user_created',
     coalesce((select tgenabled::text from pg_trigger where tgname = 'on_auth_user_created'), 'missing'),
     not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and tgenabled = 'O'),
     'enabled (O), from 20260923120000'),
    ('function is_claimable_auth_user',
     coalesce(to_regprocedure('public.is_claimable_auth_user(uuid)')::text, 'absent'),
     to_regprocedure('public.is_claimable_auth_user(uuid)') is not null,
     'absent, dropped by 20260923130000'),
    ('function current_player_id',
     coalesce(to_regprocedure('public.current_player_id()')::text, 'absent'),
     to_regprocedure('public.current_player_id()') is not null,
     'absent, 20260729120000 must never be applied'),
    ('policy players_insert_public',
     (select count(*)::text from pol where tablename = 'players' and policyname = 'players_insert_public'),
     exists (select 1 from pol where tablename = 'players' and policyname = 'players_insert_public'),
     'gone, dropped by 20260822120000'),
    ('anon INSERT on players',
     has_table_privilege('anon', 'public.players', 'insert')::text,
     has_table_privilege('anon', 'public.players', 'insert'),
     'revoked by 20260923130000'),
    ('anon SELECT on players',
     has_table_privilege('anon', 'public.players', 'select')::text,
     has_table_privilege('anon', 'public.players', 'select'),
     'no grant (feedback fix in 20261006120000 assumes this)'),
    ('trigger docs_set_server_timestamps',
     (select count(*)::text from pg_trigger where tgname = 'docs_set_server_timestamps'),
     not exists (select 1 from pg_trigger where tgname = 'docs_set_server_timestamps'),
     'present once 20261012120000 is applied')
  ) as x(object, detail, bad, expect)

union all
-- 6. Orphans the signup trigger is meant to have eliminated.
select '6 data',
       'auth users with no players row',
       (select count(*) from auth.users u
         where not exists (select 1 from public.players p where p.auth_user_id = u.id))::text,
       case when exists (select 1 from auth.users u
                          where not exists (select 1 from public.players p where p.auth_user_id = u.id))
            then 'REVIEW: orphaned accounts exist' end

union all
select '6 data',
       'players.password_hash populated',
       (select count(*) from public.players where password_hash is not null)::text,
       case when exists (select 1 from public.players where password_hash is not null)
            then 'REVIEW: Supabase Auth holds credentials; this column should not carry real hashes' end

union all
-- 7. Who is an admin. Admin rows grant read on every player, so the list should
--    be short and recognisable.
select '7 admins',
       a.auth_user_id::text,
       coalesce((select u.email from auth.users u where u.id = a.auth_user_id), 'no auth user'),
       null
  from public.admins a

union all
-- 8. Columns on players, so sensitive ones are visible at a glance.
select '8 players columns', column_name, data_type, null
  from information_schema.columns
 where table_schema = 'public' and table_name = 'players'

order by 1, 2;
