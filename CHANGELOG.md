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

### Fixed
- `/api/tournaments` `limit` param clamped to `[1, 200]` instead of silently accepting
  NaN, negative, or huge values; tournaments page no longer fetches all rows unbounded
  ([#56](https://github.com/AnayDhawan/tourneyradar/issues/56)).
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
- Routine dependency bumps (Next.js, React, TanStack Query, ESLint config, Playwright).
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
