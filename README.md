# TourneyRadar

Find chess tournaments happening near you — and around the world.

**[tourneyradar.com](https://www.tourneyradar.com)**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Demo

**[→ Live site: tourneyradar.com](https://www.tourneyradar.com)**

---

Chess tournaments are scattered across Chess-Results.com, federation websites,
and club newsletters. TourneyRadar puts them all on one map.

Filter by country, time control, and FIDE rating status. No account needed.

---

## Public API

Tournament data is freely available — no auth, no key, no cost.

**Base URL:** `https://tourneyradar-api.vercel.app`

| Endpoint | Description |
|----------|-------------|
| `GET /v1/tournaments` | List tournaments — filter by country, category, upcoming, fide_rated |
| `GET /v1/tournaments/:id` | Single tournament |
| `GET /v1/countries` | All countries with data |

```bash
curl "https://tourneyradar-api.vercel.app/v1/tournaments?country=IN&upcoming=true"
```

→ [Full API docs](https://github.com/AnayDhawan/tourneyradar-api)

---

## Stack

| | |
|---|---|
| Framework | Next.js 15, TypeScript, React 19 |
| Database | Supabase (PostgreSQL) |
| Map | Leaflet + react-leaflet-cluster |
| Scraper | Puppeteer, runs weekly via GitHub Actions |
| Styling | Tailwind CSS v4 |
| Analytics | Umami |
| Deployment | Vercel |

---

## How data gets in

A Puppeteer scraper hits Chess-Results.com weekly across 140+ federation
codes, parses tournament details, geocodes locations via Google Maps, and
upserts everything into Supabase. Runs automatically via GitHub Actions —
no manual intervention needed.

---

## Routes

**Public**
/                    → Interactive world map
/tournaments         → Paginated list of all tournaments
/tournaments/[id]    → Tournament detail page
/country/[code]      → Tournaments filtered by country
/stats               → Public analytics dashboard

**Player portal**
/player/login        → Sign in
/player/register     → Create account
/player/wishlist     → Saved tournaments

**API**
/api/tournaments           → GET — list tournaments (country, upcoming, limit)
/api/tournaments/upcoming  → GET/POST — paginated upcoming tournaments
/api/analytics             → GET — proxied Umami stats
/api/wishlist              → GET/POST/DELETE — player favorites
/api/cron/scrape-tournaments → Vercel cron trigger (stub)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
Good first issues: add a new data source, add a missing country, improve the map UI.

---

## License

MIT
