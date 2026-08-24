# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ICS calendar export on tournament detail pages ([#20](https://github.com/AnayDhawan/tourneyradar/issues/20)).
- Playwright E2E test harness + CI workflow ([#17](https://github.com/AnayDhawan/tourneyradar/issues/17)).
- Shared `queryTournaments()` helper with real pagination (Previous/Next, page counts) and
  server-driven search on the tournaments page ([#56](https://github.com/AnayDhawan/tourneyradar/issues/56)).
- Accessibility: `aria-label`s and `aria-live` result counts on both search boxes
  ([#61](https://github.com/AnayDhawan/tourneyradar/issues/61)).
- PostHog analytics via a reverse proxy (`/ingest`) to dodge adblockers, with
  identify/reset wired to Supabase auth state changes so sessions don't bleed across
  users on shared devices.
- `supabase/migrations/`: first tracked migration, adding `current_player_id()` and RLS
  policies for `players` ([#54](https://github.com/AnayDhawan/tourneyradar/issues/54)).
  Nothing in the schema was version-controlled before this.
- CI: secret-scan step fails the build on a committed Supabase project URL or JWT.
- CI: `tsc --noEmit` typecheck step, previously only caught by the Vercel preview build
  and not run at all on Dependabot PRs.
- README contributors section: auto-updating avatar grid from the GitHub contributors
  graph, replacing nothing (there was no prior list).
- Animated demo GIF referenced in the README.
- Account icon in the nav (desktop top-right, mobile drawer bottom) linking to the
  wishlist when a player is signed in; hero "Sign up, it's Free!" CTA hides once
  they're signed in.
- Dedicated `/feedback` page (centered card, star rating, GitHub-star nudge on thanks)
  replacing the inline corner-popup form; the popup is now a teaser that routes there,
  and the footer gets a permanent Feedback link. Both fire a `feedback_button_click`
  event (Umami + PostHog) tagged by source.

### Fixed
- `/api/tournaments` `limit` param clamped to `[1, 200]` instead of silently accepting
  NaN, negative, or huge values; tournaments page no longer fetches all rows unbounded
  ([#56](https://github.com/AnayDhawan/tourneyradar/issues/56)).
- `/api/tournaments`: bad `limit`/`page` values now rejected with 400 instead of
  silently falling back to defaults. Home page map no longer silently drops markers
  past row 1000 (a bare `.limit(1000)` against a 1600+ row dataset); replaced with a
  paginated fetch that walks the full result set
  ([#56](https://github.com/AnayDhawan/tourneyradar/issues/56)).
- `/api/wishlist`: GET/POST/DELETE trusted a client-supplied `player_id`, letting any
  caller read, add to, or delete another player's wishlist; now resolved from the
  authenticated session, with a 401 for anonymous callers
  ([#54](https://github.com/AnayDhawan/tourneyradar/issues/54)).
- Four pages built their own inline Supabase client with a committed project URL and
  anon key as a fallback; all now import the shared client, which throws on missing
  env vars instead of silently using the baked-in credential. The exposed anon key
  still needs rotating in the Supabase dashboard
  ([#52](https://github.com/AnayDhawan/tourneyradar/issues/52)).
- Home page's live search-result announcement only ever reported pagination state; now
  leads with the match count and echoes the search term, with distinct phrasing for
  zero results ([#61](https://github.com/AnayDhawan/tourneyradar/issues/61)).
- Scraper: Europe region split into europe-west/europe-east; merge job now resilient to
  partial matrix failures.
- Scraper failures now logged to `scraper_logs` instead of being silently swallowed.
- Mobile nav drawer duplication and hamburger icon stroke color
  ([#25](https://github.com/AnayDhawan/tourneyradar/issues/25)).
- `AuthContext.tsx` console.error scope corrected; stray console.log removed from
  `lib/geocoding.ts`.
- Supabase client lazy-initialized in the cron route (was breaking the Vercel build).
- E2E CI: Supabase env vars/secrets passed properly instead of hardcoded in the workflow.
- `prize_distribution`/`schedule` fields properly typed, replacing `any`.

### Changed
- Homepage nav and hero rebuilt: slim fixed nav, 3-mode theme toggle, signup CTA in
  place of the old login link, and a rebuilt mobile view (nav drawer, tournament
  table, drawer CTA).
- CI: e2e skipped on Dependabot PRs, which don't have access to the required secrets.
- Routine dependency bumps (Next.js, React, React DOM, TanStack Query, ESLint config,
  Playwright, Firebase, @next/third-parties, @supabase/supabase-js, Tailwind PostCSS).
- README Next.js badge bumped to 16.

## [2.0.0] - 2026-05-12

Public relaunch: OSS governance, a working scraper pipeline, and a cleaned-up README/API
reference.

### Added
- GitHub Actions scraper cron, running every 6 hours.
- Weekly and monthly analytics.
- Full OSS governance setup: LICENSE, CONTRIBUTING, CI/CD workflows, issue/PR templates.

### Fixed
- Scraper parallelized into 4 regional matrix jobs to fix a 30-minute job timeout.
- Scraper scope reduced and moved to a weekly schedule after cron debugging.
- Restored 140 federation codes, capped scraping at 20 tournaments per country.
- Chart x-axis labels readable across all date ranges.

### Changed
- README and CONTRIBUTING rewritten; API reference and demo GIF placeholder added.

[2.0.0]: https://github.com/AnayDhawan/tourneyradar/releases/tag/v2.0.0
