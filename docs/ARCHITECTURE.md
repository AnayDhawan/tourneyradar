# Architecture

> This document is a work in progress. See the README for a high-level overview.

## Key Design Decisions

- **Server Components + `unstable_cache`**: Homepage and tournament list pages are Server Components. Data is cached for 5 minutes via `unstable_cache()`, reducing Supabase query load.
- **Edge Middleware for analytics**: Page view tracking runs in the Vercel Edge runtime before any page renders, so it never adds latency to the user experience.
- **Leaflet always lazy-loaded**: Leaflet reads `window` at import time, so it's always wrapped in `next/dynamic` with `ssr: false`.
- **Scraper runs on GitHub Actions, not Vercel**: Puppeteer with Chromium exceeds Vercel's function timeout (10s max). The `/api/cron/scrape-tournaments` endpoint only triggers a log; actual scraping runs in the `scrape.yml` GitHub Actions workflow on a weekly cron with a 30-minute timeout, parallelized across four regional matrix jobs.

## Database Schema

See `supabase/migrations/` for the full DDL history.

Core tables:
- `tournaments` — all scraped tournament data
- `players` — player accounts (linked to Supabase Auth)
- `admins` — admin accounts
- `page_views` — analytics: every page visit with geo, UA, UTMs, duration
- `tournament_analytics` — per-tournament event tracking (views, PDF clicks, etc.)
- `player_favorite_tournaments` — player wishlist junction table
