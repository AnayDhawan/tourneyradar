# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run scrape     # Run the Puppeteer tournament scraper locally
```

No test suite is present in this project.

## Architecture

**TourneyRadar** aggregates over-the-board chess tournaments worldwide onto an interactive map. Data is scraped from Chess-Results.com and stored in Supabase (PostgreSQL).

### Stack
- **Framework:** Next.js (App Router) with TypeScript and React 19
- **Database:** Supabase (PostgreSQL)
- **Map:** Leaflet + react-leaflet with marker clustering (SSR-unsafe — always lazy-loaded via `next/dynamic`)
- **Data fetching:** TanStack React Query v5 on client; `unstable_cache()` (5 min revalidation) on server
- **Styling:** Tailwind CSS v4
- **Analytics:** Firebase + Vercel Analytics
- **Scraping:** Puppeteer + Cheerio

### Key Patterns

**Server vs Client Components**
- `page.tsx` files are Server Components for data fetching
- Interactive files are suffixed `Client.tsx` and use `"use client"`
- Leaflet map components are always lazy-loaded (`next/dynamic`) because Leaflet is SSR-unsafe

**Data Flow**
1. Daily Vercel cron (`0 2 * * *`) hits `/api/cron/scrape-tournaments` — this only logs activity
2. Full scraping runs via `npm run scrape` (Puppeteer, runs locally or on a beefy server)
3. Scraper geocodes locations via Google Maps API, stores results in Supabase
4. API routes at `/api/tournaments` and `/api/tournaments/upcoming` serve the frontend with 30-min cache headers

**Auth**
- Two user types: Player and Admin, managed via `lib/AuthContext.tsx`
- Supabase Auth underlies both; `AuthProvider` wraps the app in `layout.tsx`

### Important Files

| File | Purpose |
|---|---|
| `app/HomePageClient.tsx` | Main interactive map page (~24KB — the core UI) |
| `app/page.tsx` | Server Component shell for the homepage |
| `lib/supabase.ts` | Supabase client + `Tournament` type definition |
| `lib/tournaments.ts` | Server-side query helpers (getUpcomingTournaments, getTournamentStats, etc.) |
| `lib/AuthContext.tsx` | Global auth state (Player/Admin) |
| `scripts/scrape.ts` | Puppeteer scraper — fetches tournaments by country federation code |
| `app/api/cron/scrape-tournaments/route.ts` | Vercel cron endpoint (logs only, no heavy Puppeteer work) |
| `vercel.json` | Cron schedule + security/cache headers |

### Route Structure

```
/                          → Interactive world map (homepage)
/tournaments               → Paginated tournament list
/tournaments/[id]          → Tournament detail
/country/[code]            → Country-filtered view
/player/login|register|wishlist  → Player portal
/admin/login|dashboard     → Admin panel
/api/tournaments           → GET (filters: country, upcoming, limit)
/api/tournaments/upcoming  → GET/POST paginated upcoming list
/api/wishlist              → GET/POST/DELETE player favorites
/api/cron/scrape-tournaments → Vercel cron trigger
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   # Used for geocoding in scraper
CRON_SECRET                        # Bearer token for cron endpoint auth
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
