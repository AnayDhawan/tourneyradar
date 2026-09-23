-- Phase 2 of removing the orphaned-signup window (issue #177).
--
-- Do not apply this until the client change from phase 1 is deployed. That
-- change makes app/player/register/page.tsx treat "the row already exists" as
-- success. Applying this first means the trigger creates the row, the client's
-- own insert then fails on the unique index, and every registration shows an
-- error for an account that was in fact created.
--
-- What this fixes:
--   Registration calls supabase.auth.signUp() and then inserts the profile row
--   itself. Between those two calls the account exists with no profile, and
--   anything that interrupts the page strands it. #170 made that state
--   recoverable through /player/complete-profile; it did not stop it
--   happening. A trigger closes the window instead of widening the net under
--   it.
--
-- The profile fields ride along as signUp's options.data, which Supabase
-- stores on auth.users.raw_user_meta_data, so the trigger has everything it
-- needs at insert time and the client never writes to players at all.

begin;

-- One profile per account. Also what lets the trigger use ON CONFLICT, and
-- what makes the client's phase-1 fallback insert fail cleanly rather than
-- creating a second row.
--
-- players was created through the dashboard rather than in a migration, so
-- this cannot assume the constraint is absent or present. If duplicates
-- already exist the index creation fails and this whole transaction rolls
-- back, which is the right outcome: silently picking a winner would be worse.
do $$
declare
    n_duplicates integer;
begin
    select count(*) into n_duplicates
      from (
        select auth_user_id
          from public.players
         where auth_user_id is not null
         group by auth_user_id
        having count(*) > 1
      ) d;

    if n_duplicates > 0 then
        raise exception
            'players has % auth_user_id value(s) with more than one row. Resolve those before applying this migration.',
            n_duplicates;
    end if;
end $$;

create unique index if not exists players_auth_user_id_key
    on public.players (auth_user_id);

-- Reads the profile out of the metadata signUp carried, with every field
-- optional except the account itself.
--
-- SECURITY DEFINER because this runs as part of an auth.users insert, where
-- the caller has no rights on public.players at all. Empty search_path with
-- fully qualified names is the standard hardening for a definer function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    raw_rating text := nullif(trim(meta ->> 'rating'), '');
begin
    insert into public.players (auth_user_id, email, name, phone, fide_id, rating, referred_by)
    values (
        new.id,
        new.email,
        -- Never null: the column is likely NOT NULL and a signup must not fail
        -- for want of a display name. The local part of the address is a
        -- reasonable placeholder the user can change.
        coalesce(
            nullif(trim(meta ->> 'name'), ''),
            split_part(coalesce(new.email, ''), '@', 1),
            'Player'
        ),
        nullif(trim(meta ->> 'phone'), ''),
        nullif(trim(meta ->> 'fide_id'), ''),
        -- A total cast. A rating of "about 1500" must not abort the signup,
        -- so anything that is not plainly an integer is stored as null.
        case when raw_rating ~ '^[0-9]{1,5}$' then raw_rating::integer else null end,
        nullif(trim(meta ->> 'referred_by'), '')
    )
    on conflict (auth_user_id) do nothing;

    return new;
end $$;

comment on function public.handle_new_user() is
    'Creates the public.players row when an auth user is created, so an account can never exist without a profile (issue #177).';

-- Recreated rather than created, so applying this twice is safe.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

commit;
