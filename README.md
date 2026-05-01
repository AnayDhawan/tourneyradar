# TourneyRadar

TourneyRadar aggregates over-the-board chess tournaments from around the world onto an interactive map, solving the problem that chess events are scattered across Chess-Results.com, national federation websites, and club newsletters with no single place to discover what is happening globally. Players can filter by country, date, time control, and FIDE rating status without creating an account.

Live: **[tourneyradar.com](https://www.tourneyradar.com)**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript, React 19 |
| Database | Supabase (PostgreSQL) |
| Map | Leaflet + react-leaflet + react-leaflet-cluster |
| Charts | Recharts |
| Scraper | Puppeteer + Cheerio |
| Styling | Tailwind CSS v4 |
| Analytics | Umami Cloud |
| Deployment | Vercel |

---

## Live demo

![TourneyRadar Demo](https://raw.githubusercontent.com/AnayDhawan/tourneyradar/main/docs/demo.gif)

---

## Architecture

### Scraper → Database

`scripts/scrape.ts` is a Puppeteer scraper that fetches upcoming tournaments from [Chess-Results.com](https://chess-results.com) across 80+ national federation codes (e.g. `IND`, `GER`, `USA`). For each tournament it:

1. Parses the tournament name, dates, location, rounds, time control, and organizer from the HTML.
2. Infers `category` (Classical / Rapid / Blitz) and `fide_rated` from name keywords.
3. Geocodes each `city, country` pair via the Google Maps Geocoding API to get lat/lng coordinates (results are cached per run).
4. Upserts the record into the `tournaments` table in Supabase with `status = 'published'`.

### Next.js App

- `app/page.tsx` is a Server Component that fetches tournaments with `unstable_cache` (5-minute revalidation).
- `app/HomePageClient.tsx` renders the interactive Leaflet map. The map is always lazy-loaded via `next/dynamic` because Leaflet is SSR-unsafe.
- API routes at `/api/tournaments` and `/api/tournaments/upcoming` serve the frontend with 30-minute cache headers.
- TanStack React Query v5 handles client-side caching for paginated views.
- Two user roles (Player and Admin) are managed via `lib/AuthContext.tsx` backed by Supabase Auth.

### Analytics

Umami Cloud is embedded in `app/layout.tsx` and collects privacy-friendly pageview and visitor data. The `/api/analytics` route proxies the Umami API using `UMAMI_API_KEY`. The public `/stats` page visualises that data (see below).

---

## Public API

Tournament data is available via the free public API — no auth, no key needed.

**Base URL:** `https://tourneyradar-api.vercel.app`

| Endpoint | Description |
|----------|-------------|
| `GET /v1/tournaments` | List tournaments (filter by country, category, upcoming) |
| `GET /v1/tournaments/:id` | Get a single tournament |
| `GET /v1/countries` | List all available countries |

**Quick example:**
```bash
curl "https://tourneyradar-api.vercel.app/v1/tournaments?country=IN&upcoming=true"
```

Full documentation: [tourneyradar-api](https://github.com/AnayDhawan/tourneyradar-api)

---

## Environment Variables

Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
UMAMI_API_KEY=
CRON_SECRET=
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public, safe for the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (scraper only — never exposed to the browser) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps Geocoding API key (used by the scraper) |
| `UMAMI_API_KEY` | Umami Cloud API key (used by `/api/analytics`) |
| `CRON_SECRET` | Bearer token that protects the Vercel cron endpoint |

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Create and fill in environment variables
cp .env.local.example .env.local   # or create .env.local manually

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Running the Scraper

```bash
npm run scrape
```

Requires `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and (optionally) `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`. Without the Google Maps key, geocoding is skipped and tournaments are saved without coordinates. The scraper targets up to 2,000 new tournaments per run.

---

## GitHub Actions Cron

`.github/workflows/scrape.yml` runs `npm run scrape` automatically every 6 hours (`0 */6 * * *`) using repository secrets for all required environment variables. It can also be triggered manually from the **Actions** tab in GitHub.

Repository secrets required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

---

## The /stats Page

`/stats` is a public analytics dashboard powered by Umami Cloud. It shows:

- **Stat cards** — total pageviews, unique visitors, and sessions for the selected period.
- **Time-range selector** — 24h, 7d, 30d, 6m, 1y, and all-time.
- **Traffic chart** — line chart of pageviews and sessions over time (Recharts).
- **Global Reach map** — choropleth world map showing visitor distribution by country.
- **Top Countries table** — ranked list of countries by pageviews with flag emojis; expandable to show all countries.

---

## Route Structure

```
/                          → Interactive world map (homepage)
/tournaments               → Paginated tournament list
/tournaments/[id]          → Tournament detail
/country/[code]            → Country-filtered view
/stats                     → Public analytics dashboard
/player/login|register|wishlist  → Player portal
/admin/login|dashboard     → Admin panel
/api/tournaments           → GET (filters: country, upcoming, limit)
/api/tournaments/upcoming  → GET/POST paginated upcoming list
/api/analytics             → GET proxied Umami stats (used by /stats)
/api/wishlist              → GET/POST/DELETE player favorites
/api/cron/scrape-tournaments → Vercel cron trigger
```

---

## Contributing

Contributions are welcome. Please open an issue or pull request — see `.github/ISSUE_TEMPLATE` and `.github/PULL_REQUEST_TEMPLATE.md` for guidelines. For significant changes, open an issue first to discuss the approach.

---

## License

MIT — see [LICENSE](./LICENSE)
