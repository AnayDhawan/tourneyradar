-- tournaments: anon and authenticated may read published rows only.
--
-- The dashboard policy on public.tournaments is `using (true)`, so anyone with
-- the anon key could read every row, including status 'duplicate' and
-- 'invalid_date'. App code already filters on status = 'published' for every
-- public read; this moves the same rule into the database.
--
-- The dashboard policy's name was never recorded, so the DO block finds and
-- drops every SELECT (and ALL) policy on the table through pg_policies, then
-- one policy is created. service_role has bypassrls, so the scraper keeps full
-- access and needs no policy here.
--
-- Applied by hand in the SQL editor, like the rest of this folder.

begin;

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'tournaments'
       and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on public.tournaments', pol.policyname);
  end loop;
end;
$$;

create policy tournaments_published_read on public.tournaments
  for select to anon, authenticated
  using (status = 'published');

commit;
