-- Private calendar feed of a player's saved tournaments (issue #268).
--
-- A player subscribes a calendar app to
-- /api/calendar/wishlist/{token}.ics. The calendar app sends no session, so the
-- token in the URL is the whole credential, like unsubscribe_token (20260830120300).
-- Unlike that column this one lives in its own table:
--
--   * players_update_own lets a player write any column of their own row, so a
--     token column on players could be set by the client to a value it chose
--     (a short or reused one). Tokens are generated server side only, with 32
--     bytes from the OS CSPRNG (lib/calendar-feed.ts), and a player must not be
--     able to replace one with something weaker.
--   * players_select_own returns the whole row to the anon-key client. The feed
--     token is only ever handed out by the authenticated API route.
--
-- Same shape as player_age_checks (20261114120000): service role only. RLS is on,
-- no policy exists, and the API roles hold no grants, so neither a player nor an
-- anonymous visitor can read or write it with the anon key. The routes use the
-- service-role client, scoped to the player resolved from the caller's token or
-- to the single row matching the token in the feed URL.
--
-- The token is stored as issued (not hashed) because the wishlist page shows the
-- subscribe URL again whenever the player returns. It is 256 bits of randomness,
-- unguessable and never reachable with the anon key.
--
-- One row per player. Regenerating replaces the token in place, so the old URL
-- stops resolving at once. Deleting the player cascades.

begin;

create table if not exists public.player_calendar_feeds (
    player_id uuid primary key references public.players(id) on delete cascade,
    -- base64url of 32 random bytes: exactly 43 characters of [A-Za-z0-9_-].
    token text not null unique check (token ~ '^[A-Za-z0-9_-]{43}$'),
    created_at timestamptz not null default now(),
    rotated_at timestamptz
);

alter table public.player_calendar_feeds enable row level security;
revoke all on public.player_calendar_feeds from anon, authenticated;

comment on table public.player_calendar_feeds is
    'Per-player secret token for the private wishlist .ics feed (issue #268). Service role only.';

commit;
