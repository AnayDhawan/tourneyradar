-- Parental consent check for under-16 accounts (issue #254).
--
-- Signup already asks for an age basis and keeps it in auth user metadata
-- (#255). That is self-declared. This table records what was confirmed and,
-- for under-16 accounts, whether the parent or guardian has clicked the
-- confirmation link.
--
-- Service role only. RLS is on and no policy exists, and the API roles hold no
-- grants, so neither a player nor an anonymous visitor can read or write it
-- with the anon key. A player must not be able to mark their own guardian as
-- confirmed, which is why this is not a column on players (players_update_own
-- would let them set it). The API routes read and write it through the service
-- role, scoped to the player resolved from the caller's token.

begin;

create table if not exists public.player_age_checks (
    player_id uuid primary key references public.players(id) on delete cascade,
    age_basis text not null check (age_basis in ('16_or_older', 'parental_consent')),
    age_basis_at timestamptz not null default now(),
    guardian_email text,
    -- sha256 of the emailed token. The token itself is never stored.
    guardian_token_hash text unique,
    guardian_requested_at timestamptz,
    guardian_expires_at timestamptz,
    guardian_send_count integer not null default 0,
    guardian_confirmed_at timestamptz
);

alter table public.player_age_checks enable row level security;
revoke all on public.player_age_checks from anon, authenticated;

comment on table public.player_age_checks is
    'Age basis and guardian confirmation per player (issue #254). Service role only.';

-- Accounts that already confirmed an age basis at signup (#255) carry it in
-- auth metadata. Move that across so they are not asked again. Under-16
-- accounts land with no guardian email and are asked for one at next login.
insert into public.player_age_checks (player_id, age_basis, age_basis_at, guardian_email)
select p.id,
       u.raw_user_meta_data ->> 'age_basis',
       coalesce(p.created_at, now()),
       nullif(trim(u.raw_user_meta_data ->> 'guardian_email'), '')
  from public.players p
  join auth.users u on u.id = p.auth_user_id
 where u.raw_user_meta_data ->> 'age_basis' in ('16_or_older', 'parental_consent')
on conflict (player_id) do nothing;

-- New signups: record the age basis (and guardian email) as part of the same
-- insert that creates the profile, so the check cannot be skipped by closing
-- the tab. Same function as 20260923120000, extended; the players insert is
-- unchanged.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    raw_rating text := nullif(trim(meta ->> 'rating'), '');
    new_player_id uuid;
    basis text := meta ->> 'age_basis';
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
    on conflict (auth_user_id) do nothing
    returning id into new_player_id;

    if new_player_id is not null and basis in ('16_or_older', 'parental_consent') then
        insert into public.player_age_checks (player_id, age_basis, guardian_email)
        values (
            new_player_id,
            basis,
            case when basis = 'parental_consent'
                 then nullif(trim(meta ->> 'guardian_email'), '')
            end
        )
        on conflict (player_id) do nothing;
    end if;

    return new;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

commit;
