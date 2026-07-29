# Database migrations

`docs/ARCHITECTURE.md` has always referred to this directory, but it did not
exist in the repository until now, so no schema or policy was ever under
version control. Migrations added from this point forward live here.

The historical schema (tournaments, players, admins, scraper_logs and friends)
was created through the Supabase dashboard and is not reproduced here. Treat
these files as the record of changes going forward, not as a full rebuild.

## About the anon key

The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is **not a secret**. Next.js inlines every
`NEXT_PUBLIC_*` variable into the client bundle, so it is served to every
visitor of tourneyradar.com and can be read from the browser's network tab in
seconds. That is how Supabase is designed to work.

Rotating it accomplishes nothing, because the replacement is published in the
very next deploy. **Row Level Security is the only access control on these
tables.** If a table is reachable with the anon key and has no policy, it is
world-readable and world-writable.

Removing the hardcoded fallbacks from the source was still worth doing, since
credentials in source are a bad habit and the next one might be a service role
key. But it was hygiene, not a fix.

## Measured state, 2026-07-29

Probed with the public anon key against the live project:

| Table | RLS enforcing? | Evidence |
|---|---|---|
| `player_favorite_tournaments` | **Yes** | Anonymous insert returns `42501`, policy violation |
| `players` | **No** | Anonymous insert reaches `23502`, NOT NULL on email, so no policy blocked it |
| `tournaments` | Public by intent | Returns rows, as it should |

`players` currently holds zero rows, so nothing has leaked. But it stores
email, phone, `fide_id` and rating, and the moment a real person registers,
that row is readable by anyone who opens the site's JS bundle.

## Applying a migration

Against a branch or staging project **first**. Enabling RLS denies everything
not explicitly permitted, so a mistake here logs everyone out of their own
data.

```bash
supabase link --project-ref <ref>
supabase db push
```

Or paste the SQL into the dashboard SQL editor.

## 20260729120000_players_rls.sql

Enables RLS on `players` and restricts select, update and delete to the owning
user. Deliberately does **not** touch `player_favorite_tournaments`, which is
already enforcing; adding more permissive policies alongside existing ones ORs
together and could only widen access.

### The registration problem

`app/player/register/page.tsx` calls `supabase.auth.signUp()` and then
immediately inserts the profile row from the client.

If this project requires email confirmation, `signUp` returns a user but **no
session**, so the browser is still anonymous when the insert runs and
`auth.uid()` is null. A strict `with check (auth_user_id = auth.uid())` would
break registration outright.

The insert policy therefore allows two cases: an authenticated user inserting
their own row, or an anonymous caller inserting a row whose `auth_user_id`
belongs to an auth user created in the last five minutes and which does not
already have a profile.

That is a compromise, not an ideal. It is narrow enough to be safe in practice
and wide enough to keep signup working either way.

### The better long-term fix

Stop inserting the profile from the client. Create it with a trigger on
`auth.users`, which is the standard Supabase pattern:

```sql
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.players (auth_user_id, email) values (new.id, new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Then the client never writes to `players` at all, the anon insert grant can be
revoked entirely, and the policy collapses to a single strict rule. Registration
would change to collect the remaining profile fields as an update after sign-in.
That is a code change as well as a schema change, so it is not bundled here.

## Verify after applying

With a signed-in player:

1. `/player/wishlist` still lists that player's tournaments
2. Adding and removing a tournament still works
3. **Register a brand new account end to end.** This is the step most likely
   to break
4. A second player's `player_id` returns zero rows rather than their data
5. A signed-out browser gets nothing from `players`

Re-run the probe afterwards to confirm the hole is closed:

```bash
curl -X POST "$SUPABASE_URL/rest/v1/players" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" -d '{}'
```

Before: `23502`, NOT NULL violation, meaning no policy blocked it.
After: `42501`, policy violation. That is the result you want.

If registration breaks, the cause is almost certainly the `auth.uid()` being
null case above. Fix it by moving to the trigger approach rather than by
loosening the policy.
