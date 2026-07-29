# Database migrations

`docs/ARCHITECTURE.md` has always referred to this directory, but it did not
exist in the repository until now, so no schema or policy was under version
control. Migrations added from this point forward live here.

The historical schema (tournaments, players, admins, scraper_logs and friends)
was created through the Supabase dashboard and is not reproduced here. Treat
these files as the record of changes going forward, not as a full rebuild.

## Applying a migration

Via the Supabase CLI, against a branch or staging project first:

```bash
supabase link --project-ref <ref>
supabase db push
```

Or paste the SQL into the dashboard SQL editor.

## 20260729000000_wishlist_rls.sql

Enables Row Level Security on `players` and `player_favorite_tournaments`,
and adds a `current_player_id()` helper that maps the current JWT to a
`players.id`.

This is the database-level half of the wishlist authorization fix. The
application half is `getAuthenticatedPlayer()` in `lib/supabase-server.ts`,
used by `app/api/wishlist/route.ts`. Both are needed: the route protects the
API surface, and RLS protects the direct anon-key queries that
`app/player/wishlist/page.tsx` still makes from the browser.

**Verify after applying**, with a signed-in player:

1. `/player/wishlist` still lists that player's tournaments.
2. Adding and removing a tournament still works.
3. A second player's `player_id` returns zero rows rather than their data.
4. A signed-out browser gets nothing from either table.

If step 1 or 2 fails, the likely cause is that `players.auth_user_id` is null
for that account, which breaks the ownership chain. Backfill it before
retrying rather than loosening the policies.
