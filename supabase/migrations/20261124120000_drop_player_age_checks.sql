-- Remove the under-16 guardian confirmation (issue #254 is withdrawn).
--
-- Signup no longer asks for an age basis or a guardian email, so the table that
-- recorded them and the part of handle_new_user() that wrote to it are gone.
--
-- Apply this AFTER the matching code is deployed. While the old code is live,
-- signups that send an age basis would fail if the table were already dropped.
--
-- Data loss: public.player_age_checks is dropped with its rows (2 rows on the
-- live project on 2026-11-23, both '16_or_older'). Nothing else reads it.
-- Safe to run twice.

begin;

-- handle_new_user() as in 20260923120000, without the player_age_checks insert.
-- Still SECURITY DEFINER with an empty search_path, and still not callable by
-- the API roles.
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
        coalesce(
            nullif(trim(meta ->> 'name'), ''),
            split_part(coalesce(new.email, ''), '@', 1),
            'Player'
        ),
        nullif(trim(meta ->> 'phone'), ''),
        nullif(trim(meta ->> 'fide_id'), ''),
        case when raw_rating ~ '^[0-9]{1,5}$' then raw_rating::integer else null end,
        nullif(trim(meta ->> 'referred_by'), '')
    )
    on conflict (auth_user_id) do nothing;

    return new;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop table if exists public.player_age_checks;

commit;
