# Architecture

> This document is a work in progress. See the README for a high-level overview.
>
> Last verified against the code on 2026-10-21 (cache times, the scrape workflow, middleware). For the scraper itself see [`scraping-architecture.md`](scraping-architecture.md).

## Key Design Decisions

- **Server Components + `unstable_cache`**: Homepage and tournament list pages are Server Components. Data is cached with `unstable_cache()` and the `tournaments` tag: 30 minutes for the homepage (the same freshness as the `/api/tournaments` responses), 1 hour for `/dataset` and `/status`. The scrape workflow also purges the tag through `POST /api/revalidate` (locked to `CRON_SECRET`) as soon as new data is written, so pages don't wait for the TTL.
- **Edge Middleware only for the visitor's country**: `middleware.ts` runs on `/` and sets a short-lived `tr_geo_country` cookie from Vercel's geo header, so the homepage stays cacheable and only reads the cookie on the client. It does no page view tracking.
- **Leaflet always lazy-loaded**: Leaflet reads `window` at import time, so it's always wrapped in `next/dynamic` with `ssr: false`.
- **Scraper runs on GitHub Actions, not Vercel**: Puppeteer with Chromium exceeds Vercel's function timeout (10s max). The `/api/cron/scrape-tournaments` endpoint only triggers a log; actual scraping runs in the `scrape.yml` GitHub Actions workflow on a weekly cron (Sunday 02:00 UTC) with a 45-minute timeout per job, parallelized across ten regional matrix jobs and then merged by a final job.
- **`tournaments` history is trigger-based, not application-level**: `tournaments` is current-state only, every scrape upserts onto it and each version before the last upsert would otherwise be lost, worse once a tournament's date passes since the scraper never touches that row again. A `tournament_history` table (issue #125) captures every version instead, written by an `after insert or update` trigger rather than a code change in `scripts/scrape.ts`, because the closed-source admin panel (see `CONTRIBUTING.md`) also writes to `tournaments` directly and an application-level-only approach would miss those writes entirely. See `supabase/migrations/20260830120200_tournament_history_table.sql` for the full reasoning.

## Database Schema

See `supabase/migrations/` for the full DDL history.

Core tables:
- `tournaments`: all scraped tournament data (current state only)
- `tournament_history`: append-only jsonb snapshot of every insert/update to `tournaments`, written by a trigger; public read-only, see the migration file for why
- `players`: player accounts (linked to Supabase Auth)
- `admins`: admin accounts
- `page_views`: analytics: every page visit with geo, UA, UTMs, duration
- `tournament_analytics`: per-tournament event tracking (views, PDF clicks, etc.)
- `player_favorite_tournaments`: player wishlist junction table
