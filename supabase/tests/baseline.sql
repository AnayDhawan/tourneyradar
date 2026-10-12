-- Offline stand-in for the parts of the Supabase project that were created in
-- the dashboard and never put under version control (see supabase/README.md).
-- rls.test.mjs loads this, then replays supabase/migrations on top.
--
-- Anything marked ASSUMED is reconstructed from the README's "Measured state"
-- sections and from app code, not read from the live project. Run
-- supabase/audit/rls_audit.sql against the real project to confirm.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now(),
  raw_user_meta_data jsonb
);
create function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
-- Supabase grants every new public table and function to the API roles.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- ASSUMED: shape of admins and its policy. players policies subquery it, so
-- authenticated users must be able to see at least their own row.
create table public.admins (auth_user_id uuid primary key references auth.users(id));
alter table public.admins enable row level security;
create policy admins_read_own on public.admins
  for select to authenticated using (auth_user_id = auth.uid());

-- ASSUMED: columns beyond those the migrations and app code reference.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  email text not null,
  name text not null,
  phone text,
  fide_id text,
  rating integer,
  password_hash text,
  created_at timestamptz not null default now()
);

-- ASSUMED: tournaments is publicly readable and writable only by service_role.
create table public.tournaments (
  id text primary key,
  name text,
  start_date date
);
alter table public.tournaments enable row level security;
create policy tournaments_public_read on public.tournaments
  for select to anon, authenticated using (true);

-- players as measured on 2026-08-22: four dashboard policies, and an anon
-- role holding INSERT only (anon select on players raised 42501 by 2026-10-06).
alter table public.players enable row level security;
revoke all on public.players from anon;
grant insert on public.players to anon;

create policy players_select_own on public.players
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
  );
create policy players_update_own on public.players
  for update to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (select 1 from public.admins a where a.auth_user_id = auth.uid())
  );
create policy players_delete_admin on public.players
  for delete to authenticated
  using (exists (select 1 from public.admins a where a.auth_user_id = auth.uid()));
create policy players_insert_public on public.players
  for insert to public with check (true);
