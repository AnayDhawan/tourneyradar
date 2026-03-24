# TourneyRadar

**The global over-the-board chess tournament aggregator.**

[![Tournaments](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Ftourneyradar.com%2Fapi%2Ftournaments%3Flimit%3D1%26upcoming%3Dtrue&query=%24.tournaments.length&label=tournaments&color=3b82f6)](https://tourneyradar.com)
[![Countries](https://img.shields.io/badge/countries-100%2B-green)](https://tourneyradar.com)
[![Updated](https://img.shields.io/badge/updated-every%206h-orange)](https://github.com/AnayDhawan/tourneyradar/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Live: [tourneyradar.com](https://tourneyradar.com)

---

## What it does

TourneyRadar automatically collects upcoming chess tournaments from 100+ countries and displays them on an interactive world map. Filter by country, category (Classical / Rapid / Blitz), date range, or FIDE-rated status. Add tournaments to your personal wishlist.

**Data sources:**
- [Chess-Results.com](https://chess-results.com) — FIDE-registered OTB tournaments worldwide
- [Lichess](https://lichess.org) — online and hybrid events

---

## How It Works

```
Chess-Results federation pages
        ↓
  Tournament link collection (Puppeteer)
        ↓
  Per-tournament detail scraping
  (name, dates, location, organizer, time control)
        ↓
  Google Maps geocoding (lat/lng)
        ↓
  Upsert into Supabase (PostgreSQL)
        ↓
  Next.js API routes serve the frontend
```

1. The scraper (`scripts/scrape.ts`) visits the federation listing page for each country on Chess-Results (e.g. `fed.aspx?fed=IND` for India), collects all tournament links, then scrapes each tournament page for details.
2. Locations are geocoded using the Google Maps Geocoding API. Results are cached in-run to avoid duplicate API calls.
3. Data is upserted into Supabase on the `id` field (format: `cr_<tournament-number>`) so re-runs are safe and don't create duplicates.
4. The scraper runs automatically every 6 hours via GitHub Actions. It can also be triggered manually with `npm run scrape`.

---

## Data Coverage

| Dimension | Coverage |
|---|---|
| Countries | 100+ federations |
| Primary source | Chess-Results.com |
| Update frequency | Every 6 hours (GitHub Actions) |
| Tournament types | Classical, Rapid, Blitz |
| Map coverage | All geocoded tournaments shown on interactive map |

Top countries by tournament volume: India, Russia, Germany, USA, China, France, Spain, Netherlands, England, Poland.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) | Server components for fast SSR, ISR caching |
| Language | TypeScript 5 | Strict types across scraper and frontend |
| Database | [Supabase](https://supabase.com/) (PostgreSQL) | Realtime-ready, generous free tier |
| Map | [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) | Lightweight, no API key for map tiles |
| Scraping | [Puppeteer](https://pptr.dev/) + [Cheerio](https://cheerio.js.org/) | JS-rendered pages need a headless browser |
| Geocoding | [Google Maps API](https://developers.google.com/maps) | Best accuracy for obscure venue names |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first, CSS-variable theming |
| Hosting | [Vercel](https://vercel.com/) | Edge caching, cron jobs, zero-config deploys |
| Analytics | [Firebase](https://firebase.google.com/) + custom `page_views` table | Dual tracking |

---

## Local Setup

```bash
git clone https://github.com/AnayDhawan/tourneyradar
cd tourneyradar
npm install
cp .env.example .env.local
# Fill in all values in .env.local
npm run dev
```

**Run the scraper locally** (requires all env vars, downloads Chromium on first run):

```bash
npm run scrape
```

---

## Open Source Model

TourneyRadar is a **centralized aggregator** — there is one shared database that powers the public site. You don't need to self-host anything to contribute.

- The app reads from Supabase using the public anon key.
- The scraper writes with the service role key (maintainers only).
- Contributors add new scrapers via pull requests — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Roadmap

See the [Feature Ideas section in CONTRIBUTING.md](CONTRIBUTING.md#feature-ideas) for open contribution opportunities:

- Calendar export (ICS)
- Email / push notifications
- Rating filter
- Tournament reviews
- Mobile app
- Multi-language UI

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
