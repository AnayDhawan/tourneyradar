-- Referral / invite-a-friend, v1 (GitHub issue #123).
--
-- The issue itself flags this as optional/low priority, "no evidence of
-- demand yet", worth a simple share action rather than a growth system.
-- This is the minimal version: a shareable code per player and a count of
-- who signed up with it. No fraud detection, no reward tiers, no
-- leaderboards, nothing beyond that.
--
-- Two new columns on players:
--   referral_code  short unique code, auto-generated on insert, used to
--                  build a player's own share link (<origin>/?ref=<code>)
--   referred_by    the referral_code of whoever referred this player,
--                  captured at registration if a `?ref=` query param was
--                  present earlier in the visit. Nullable, most players
--                  have no referrer. Deliberately NOT a foreign key: a
--                  stale, mistyped, or copy-pasted-wrong code should not
--                  break registration, it should just fail to count later.
--
-- Not to be confused with players.referral_source, added in
-- 20260830120000_player_profile_fields.sql. That is a free-text "how did
-- you hear about us" onboarding answer, unrelated to this and untouched
-- here.

begin;

alter table public.players add column if not exists referral_code text;
alter table public.players add column if not exists referred_by text;

-- Generates an 8-character uppercase hex code. Core functions only
-- (md5/random/clock_timestamp), no extension dependency.
create or replace function public.generate_referral_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

-- Assigns a unique referral_code on insert unless one was already supplied.
-- Retries on collision. 8 hex chars is ~4 billion possible codes so a
-- collision is rare, but the loop means a rare one fails the insert loudly
-- instead of silently handing out a duplicate code.
create or replace function public.set_player_referral_code()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  attempts int := 0;
begin
  if new.referral_code is not null then
    return new;
  end if;

  loop
    candidate := public.generate_referral_code();
    attempts := attempts + 1;
    exit when not exists (
      select 1 from public.players where referral_code = candidate
    );
    if attempts > 10 then
      raise exception 'generate_referral_code: no unique code after % attempts', attempts;
    end if;
  end loop;

  new.referral_code := candidate;
  return new;
end;
$$;

drop trigger if exists players_set_referral_code on public.players;
create trigger players_set_referral_code
  before insert on public.players
  for each row
  execute function public.set_player_referral_code();

-- Backfill existing rows before the NOT NULL / unique index below, otherwise
-- every player who signed up before this migration is stuck without a
-- shareable link.
do $$
declare
  r record;
  candidate text;
begin
  for r in select id from public.players where referral_code is null loop
    loop
      candidate := public.generate_referral_code();
      exit when not exists (
        select 1 from public.players where referral_code = candidate
      );
    end loop;
    update public.players set referral_code = candidate where id = r.id;
  end loop;
end $$;

alter table public.players alter column referral_code set not null;

create unique index if not exists players_referral_code_key
  on public.players (referral_code);

-- Counts how many players a given player referred, without exposing any of
-- the referred players' rows to them. RLS on players scopes select to the
-- owning row (see supabase/README.md), so a plain client-side
-- `select count(*) ... where referred_by = my_code` would just return 0 for
-- everyone, it can never see rows belonging to other players. This is
-- SECURITY DEFINER specifically so the count itself can look across rows;
-- the caller still only ever gets a single number back, never another
-- player's email/phone/rating. search_path is pinned empty and every
-- reference fully qualified, same hardening as is_claimable_auth_user in
-- 20260822120000_players_insert_policy.sql.
create or replace function public.my_referral_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.players referred
  join public.players me on me.auth_user_id = auth.uid()
  where referred.referred_by = me.referral_code
$$;

revoke all on function public.my_referral_count() from public;
grant execute on function public.my_referral_count() to authenticated;

commit;
