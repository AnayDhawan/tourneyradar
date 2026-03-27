# TourneyRadar

**The global platform for finding over-the-board chess tournaments.**

Chess tournament discovery is broken. Events are scattered across Chess-Results.com, national federation websites, WhatsApp groups, and club newsletters — with no single place to find what's happening worldwide. Players regularly miss tournaments they'd love to play in.

TourneyRadar fixes that. It aggregates upcoming tournaments from 60+ countries into one searchable, filterable platform with an interactive map, smart filters, and a real-time data pipeline scraping Chess-Results.com daily.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Live: **[tourneyradar.com](https://www.tourneyradar.com)**

![TourneyRadar Screenshot](./docs/screenshot.png)

---

## Features

- **Global tournament map** — Interactive Leaflet map with marker clustering; 500+ tournaments across 40+ countries at a glance
- **Smart filtering** — Filter by country, date range, time control (Classical / Rapid / Blitz), and FIDE rating status
- **Real-time data pipeline** — Puppeteer scraper pulls from Chess-Results.com, geocodes locations via Google Maps, and normalizes data across federation formats
- **Player accounts** — Wishlist / favorites, profile with FIDE ID and rating
- **Admin analytics dashboard** — Vercel-style analytics: page views, unique visitors, avg. session duration, bounce rate, hourly traffic comparison, top pages, referrers, countries, OS, browser, and device breakdown
- **SEO-optimized** — Dynamic `sitemap.xml`, structured metadata for every tournament and country page
- **Mobile-first** — Fully responsive design with a clean dark/light mode

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DATA SOURCES                                               │
│  Chess-Results.com  ·  National federations                 │
└────────────────────────┬────────────────────────────────────┘
                         │  Puppeteer + Cheerio
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  SCRAPER PIPELINE  (scripts/scrape.ts)                      │
│  Parse · Geocode (Google Maps) · Deduplicate · Normalize    │
└────────────────────────┬────────────────────────────────────┘
                         │  Supabase JS client
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  DATABASE  (Supabase PostgreSQL)                            │
│  tournaments · players · admins · page_views               │
│  player_favorite_tournaments · tournament_analytics        │
└──────────┬──────────────────────────────────────────────────┘
           │  REST API / Supabase client
           ▼
┌─────────────────────────────────────────────────────────────┐
│  NEXT.JS APP  (App Router)                                  │
│  Server Components → unstable_cache (5 min revalidation)   │
│  API Routes → Cache-Control: s-maxage=1800                  │
│  Client Components → TanStack React Query v5               │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  ANALYTICS PIPELINE                                         │
│  Edge Middleware → page_views (geo, UA, UTMs)              │
│  Client tracker → screen_width · duration · referrer       │
│  Admin dashboard → /admin/analytics                        │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR, API routes, ISR caching |
| Language | TypeScript 5 | End-to-end type safety |
| Database | Supabase (PostgreSQL) | Tournaments, users, analytics |
| Map | Leaflet + react-leaflet | Interactive world map |
| Clustering | react-leaflet-cluster | Marker grouping at scale |
| Charts | Recharts | Analytics dashboard visualizations |
| Auth | Supabase Auth | Player + Admin sessions |
| Styling | Tailwind CSS v4 | Utility-first design system |
| Scraping | Puppeteer + Cheerio | Headless browser scraping |
| Geocoding | Google Maps API | Address → lat/lng coordinates |
| Analytics | Firebase + Vercel Analytics | Event + pageview tracking |
| Deployment | Vercel | Edge network, cron jobs |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- [Supabase](https://supabase.com/) account (free tier works)
- [Google Maps API key](https://developers.google.com/maps/documentation/geocoding/get-api-key) (for scraper geocoding only)

### Setup

```bash
git clone https://github.com/AnayDhawan/tourneyradar.git
cd tourneyradar
npm install
```

Copy the example env file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key (server-side only)

# Scraper
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # Google Maps Geocoding API key

# Firebase Analytics (optional)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Cron security
CRON_SECRET=                       # Secret for Vercel cron endpoint auth
```

Start the dev server:

```bash
npm run dev        # http://localhost:3000
npm run build      # Production build
npm run scrape     # Run the scraper (requires .env.local)
```

---

## Project Structure

```
tourneyradar/
├── app/
│   ├── admin/analytics/         # Admin analytics dashboard (admin-only)
│   ├── api/
│   │   ├── admin/analytics/     # Overview, daily, hourly, pages, referrers, countries, devices
│   │   ├── analytics/duration/  # Client-side duration beacon endpoint
│   │   ├── tournaments/         # Tournament list + paginated upcoming endpoints
│   │   ├── cron/                # Vercel daily cron trigger
│   │   └── wishlist/            # Player favorites
│   ├── country/[code]/          # Country-filtered pages (SEO)
│   ├── player/                  # Login, register, wishlist
│   ├── tournaments/[id]/        # Individual tournament detail pages
│   ├── HomePageClient.tsx       # Interactive map (core UI, ~24KB)
│   └── layout.tsx               # Root layout with providers + analytics
├── components/
│   └── BaseLayout.tsx           # Shared nav + footer shell
├── lib/
│   ├── supabase.ts              # Supabase client + Tournament type
│   ├── tournaments.ts           # Server-side query helpers
│   ├── tracker.ts               # Client-side pageview + duration tracking
│   ├── analytics.ts             # Tournament event tracking
│   └── AuthContext.tsx          # Global auth state (Player / Admin)
├── middleware.ts                # Edge middleware: tracking, geo, UA parsing
├── scripts/
│   └── scrape.ts                # Puppeteer scraper (run locally or on a server)
└── vercel.json                  # Cron schedule + security headers
```

---

## Data Pipeline

The scraper is the most technically complex piece. Here's how it works end-to-end:

1. **Fetch** — Puppeteer navigates Chess-Results.com's federation-filtered tournament lists for 60+ country federation codes (e.g. `fed.aspx?fed=IND` for India)
2. **Parse** — Cheerio extracts tournament name, dates, location, rounds, time control, organizer, and source URLs from the HTML
3. **Normalize** — Date strings like `2025/04/12 to 2025/04/15` are parsed into ISO format; `category` (Classical/Rapid/Blitz) and `fide_rated` are inferred from tournament name keywords
4. **Geocode** — Each `city, country` pair is sent to the Google Maps Geocoding API to get lat/lng; results are cached within the run to avoid duplicate API calls
5. **Deduplicate** — Tournaments are upserted by `source_url`, so re-running the scraper safely updates existing records without creating duplicates
6. **Store** — Records are written to Supabase with `status = 'published'`; the frontend only surfaces future events

The scraper runs on demand via `npm run scrape`. A daily Vercel cron at `0 2 * * *` hits `/api/cron/scrape-tournaments` for logging; the heavy Puppeteer work runs locally or on a dedicated machine to avoid Vercel's function timeout limits.

---

## Analytics

Page views are tracked at the edge before any page renders. `middleware.ts` fires a fire-and-forget insert into `page_views` capturing:

- Path, referrer, session ID (cookie-based, 30-day window)
- **Geo**: country, city, region from Vercel's `x-vercel-ip-*` headers
- **Device**: OS, browser, device type parsed from User-Agent (no external dependencies)
- **UTM parameters**: `utm_source`, `utm_medium`, `utm_campaign` from query string
- **Duration**: tracked client-side via `visibilitychange` / `beforeunload`, sent via `navigator.sendBeacon()`
- **Screen width**: captured client-side and sent with the initial insert

The admin dashboard at `/admin/analytics` (requires admin login) aggregates all of this into a Vercel Analytics-style UI with charts, breakdown tables, and date range selection.

---

## Contributing

Issues and pull requests are welcome. For significant changes, open an issue first to discuss the approach.

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Author

**Anay Dhawan** — [GitHub](https://github.com/AnayDhawan)
