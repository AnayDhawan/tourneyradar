-- Docs knowledge base: maintainer-written + user-contributed guides.
--
-- Same RLS reasoning as feedback_table.sql -- a table reachable with the
-- anon key and no policy is world-readable and world-writable, so RLS is
-- on from the start, not bolted on later.

create table if not exists public.docs (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  summary text,
  content text not null,
  author_type text not null check (author_type in ('maintainer','user')),
  author_player_id uuid references public.players(id) on delete set null,
  author_display_name text not null,
  status text not null default 'published' check (status in ('published','unpublished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists docs_status_created_at_idx
  on public.docs (status, created_at desc);

create index if not exists docs_author_player_id_idx
  on public.docs (author_player_id);

alter table public.docs enable row level security;

-- Anyone (including anon) reads published docs. Unpublished rows (a
-- maintainer's after-the-fact takedown) are invisible to everyone except
-- direct Supabase dashboard access -- there's no client-side unpublish
-- path, so no policy needs to expose them to a signed-in author either.
drop policy if exists "anyone can read published docs" on public.docs;
create policy "anyone can read published docs"
  on public.docs for select
  to anon, authenticated
  using (status = 'published');

-- User-submitted docs only, capped at 2 per rolling 7 days. The subquery
-- is the enforcement -- same inline style as players_insert_own_row's
-- 5-minute check, so it can't be bypassed from the client. Maintainer
-- docs are seeded directly below (service role), never through this
-- policy, so it doesn't need to allow author_type = 'maintainer' at all.
drop policy if exists "players can publish up to 2 docs per week" on public.docs;
create policy "players can publish up to 2 docs per week"
  on public.docs for insert
  to authenticated
  with check (
    author_type = 'user'
    and exists (
      select 1 from public.players p
      where p.id = author_player_id and p.auth_user_id = auth.uid()
    )
    and (
      select count(*) from public.docs d
      where d.author_player_id = author_player_id
        and d.created_at > now() - interval '7 days'
    ) < 2
  );

-- Seed maintainer docs. author_player_id is null (no single player owns
-- these); author_display_name is the literal string the UI shows instead
-- of a username.
insert into public.docs (slug, title, summary, content, author_type, author_display_name)
values
  (
    'fide-tournament-registration',
    'How to register for a FIDE-rated tournament',
    'What FIDE rating means, what you need before you sign up, and how registration usually works.',
    E'FIDE-rated tournaments report results to FIDE, so your performance can move your official rating. Most organizers run them the same way as any other over-the-board event, just with a couple of extra requirements.\n\n## Before you register\n\n- **A FIDE ID.** If you have never played a FIDE-rated game, you do not have one yet -- your national federation assigns it the first time your result is submitted, so your very first FIDE-rated tournament is also what creates it.\n- **Your national federation.** Some organizers ask for it on the entry form; it determines which federation your result gets reported under.\n- **A rated (or unrated, check the listing) format.** TourneyRadar marks a tournament FIDE-rated when the organizer has reported it as such -- filter by "FIDE Rated: Yes" on the [tournament explorer](/tournaments) to see only those.\n\n## Registering\n\n1. Find the tournament on TourneyRadar and open its detail page.\n2. Follow the **organizer''s own registration link** -- TourneyRadar aggregates listings, it does not run registration itself, so you will always finish signing up on the organizer''s own site or form.\n3. Bring a form of ID to the venue; most arbiters check it against your entry before round 1.\n\nSee also: [How TourneyRadar helps you register for a tournament](/docs/how-tr-helps-you-register), [Understanding FIDE ratings](/docs/understanding-fide-ratings).',
    'maintainer',
    'TourneyRadar maintainers'
  ),
  (
    'how-tr-helps-you-register',
    'How TourneyRadar helps you register for a tournament',
    'TourneyRadar aggregates listings and links you to the organizer -- here''s exactly where that handoff happens.',
    E'TourneyRadar is a **discovery** layer, not a registration system: it does not take entries, hold payments, or confirm your spot. What it does is get you to the right listing fast and hand you off cleanly to the organizer.\n\n## What TourneyRadar does\n\n- Aggregates tournaments from federation and organizer sources onto one searchable map and table.\n- Lets you filter by location, category, date range, and FIDE-rated status so you are not scrolling through events that do not match what you play.\n- Surfaces each tournament''s **organizer link** on its detail page -- that is where you actually register.\n\n## What happens when you click "View Details"\n\nYou land on the tournament''s detail page with the essentials (dates, location, category, FIDE-rated status) and a link out to the organizer''s own registration page or contact info. That link is the real registration step; TourneyRadar''s job ends at getting you there with the right information already in hand.\n\n## Save it for later\n\nSigned in, you can add a tournament to your [wishlist](/player/wishlist) and optionally get a weekly digest so you do not lose track of it before entries close. See [Wishlist + email digest guide](/docs/wishlist-and-email-digest).',
    'maintainer',
    'TourneyRadar maintainers'
  ),
  (
    'find-a-tournament-near-you',
    'Finding and registering for a tournament near you',
    'Using the map, filters, and wishlist together to find something close to home.',
    E'The fastest path to "what''s near me" uses the map and the State filter together, not just scrolling the table.\n\n## On the homepage\n\n1. Open the [live map preview](/) or jump straight to the [Tournament Explorer](/tournaments).\n2. Switch between **Europe** and **World** views depending on where you are looking.\n3. Use the **State** filter to narrow to your region once you have zoomed in -- it is populated from the actual tournaments in the current dataset, so it never shows an option with zero results.\n\n## Combine filters\n\nLocation alone is rarely enough -- stack it with **Category** (Classical/Rapid/Blitz/etc.) and **FIDE Rated** to get a short, relevant list instead of everything within a few hundred kilometers.\n\n## Share what you found\n\nThe **Share Filters** button on the Tournament Explorer copies a link that reopens with your exact filters applied -- useful for sending a shortlist to a training partner or coach without re-explaining your search.\n\nOnce you have found one, follow [how TourneyRadar helps you register](/docs/how-tr-helps-you-register) to get to the organizer''s own entry form.',
    'maintainer',
    'TourneyRadar maintainers'
  ),
  (
    'how-trs-data-works',
    'How TR''s data works',
    'Where tournament data comes from, how often it refreshes, and what "FIDE-rated" means in a listing.',
    E'## Where the data comes from\n\nTourneyRadar runs an automated scraper against public tournament listing sources, geocodes each event, and stores the result. It is not manually curated tournament-by-tournament -- freshness and coverage both depend on the scraper running cleanly, which is why scraper health has its own [status page](/stats).\n\n## Refresh cadence\n\nThe scraper runs on a recurring schedule (currently every 6 hours via a GitHub Actions cron job) and only touches upcoming, published events. If a tournament looks stale or wrong, it likely has not been re-scraped since the organizer last updated it at the source.\n\n## What "FIDE-rated" means here\n\nA tournament is marked FIDE-rated when the source listing itself reports it as FIDE-rated. TourneyRadar does not independently verify FIDE-rating status with FIDE -- always confirm on the organizer''s own page before assuming a result will be rated.\n\n## Open source, open data\n\nThe scraper and the schema are public in the [GitHub repo](https://github.com/AnayDhawan/tourneyradar). If you spot a data quality issue, [open an issue](https://github.com/AnayDhawan/tourneyradar/issues/new) rather than guessing at a fix -- someone else may already be tracking the same one.',
    'maintainer',
    'TourneyRadar maintainers'
  ),
  (
    'wishlist-and-email-digest',
    'Wishlist + email digest guide',
    'Save tournaments you care about and get a weekly email matching your categories and location.',
    E'Signing up unlocks two related features: a personal **wishlist** and an optional **weekly digest** email.\n\n## Wishlist\n\nOn any tournament (its detail page or the Tournament Explorer table), the heart/save icon adds it to your wishlist. Open the full list any time from the account menu in the nav, or at [/player/wishlist](/player/wishlist).\n\n## Weekly digest\n\nDuring [onboarding](/player/onboarding) -- or later from your account settings -- you can opt into a weekly email that matches new or upcoming tournaments against:\n\n- Your **home country**\n- The **categories** you told us you play (Classical/Rapid/Blitz)\n- Whether you asked for **FIDE-rated only**\n\nIt is off by default. Choosing "Don''t email me" during onboarding, or later, means TourneyRadar will not send it -- you can always revisit the choice.\n\n## Why this matters\n\nThe wishlist and digest are the difference between finding a tournament once and actually remembering to register before entries close.',
    'maintainer',
    'TourneyRadar maintainers'
  ),
  (
    'for-tournament-organizers',
    'For tournament organizers: getting your tournament listed',
    'How organizers can get a tournament onto TourneyRadar''s map.',
    E'TourneyRadar''s listings come from an automated scraper against known public sources, so the most reliable way to be listed is to publish your tournament somewhere that scraper already covers (your federation''s calendar, Chess-Results.com, or another indexed source) with clear dates, location, and category.\n\n## If your tournament is not showing up\n\n1. Check that it is published somewhere public with a real date and location -- the scraper cannot list what it cannot find.\n2. Wait for the next scrape cycle (see [how TR''s data works](/docs/how-trs-data-works) for the current cadence).\n3. Still missing after that? [Open an issue on GitHub](https://github.com/AnayDhawan/tourneyradar/issues/new) with the tournament name, dates, and a link to your listing -- that is the fastest way to get a source added or a scraper bug fixed.\n\n## What organizers should keep accurate\n\nOnce listed, TourneyRadar re-scrapes on its normal cycle, so keeping your **dates, location, and category** correct and up to date at the source is what keeps your TourneyRadar listing correct too -- there is no separate place to edit it here.',
    'maintainer',
    'TourneyRadar maintainers'
  ),
  (
    'understanding-fide-ratings',
    'Understanding FIDE ratings',
    'What the number means, and how Classical, Rapid, and Blitz ratings differ.',
    E'A FIDE rating is a single number meant to represent your playing strength, computed from the results of your FIDE-rated games against other rated players.\n\n## Three separate ratings, not one\n\nFIDE tracks **Classical**, **Rapid**, and **Blitz** ratings independently based on the time control played:\n\n- **Classical**: longer time controls (typically 90+ minutes with increment). The rating most people mean by "FIDE rating" with no qualifier.\n- **Rapid**: shorter games, roughly 10-60 minutes.\n- **Blitz**: fast games, typically under 10 minutes.\n\nA player can have a strong Classical rating and no Blitz rating at all (or vice versa) simply from never having played enough rated games of that type.\n\n## Roughly reading the number\n\nRatings are relative, not absolute -- a 1500 beating a 1600 is a normal, unsurprising result, while a 1200 beating a 2000 is a major upset. There is no single global "skill tier" table; how a given number feels varies somewhat by federation and region.\n\n## Where it comes from\n\nYour rating changes after every FIDE-rated game you play, based on the result and your opponent''s rating at the time. See [how to register for a FIDE-rated tournament](/docs/fide-tournament-registration) for what it takes to start building one.',
    'maintainer',
    'TourneyRadar maintainers'
  )
on conflict (slug) do nothing;
