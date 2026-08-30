# Scraping Architecture

> Deep-dive into how TourneyRadar aggregates over-the-board tournaments from [Chess-Results.com](https://chess-results.com) across 140+ federations. Intended for contributors and anyone curious how a small open-source project stays fresh worldwide without paid data feeds.

## TL;DR

```
Chess-Results.com (fed.aspx?fed=IND … fed=GER …)
        │
        ├── 10 GitHub Actions matrix jobs (one per region, 45 min timeout each)
        │       └── Puppeteer → fetch fed page → extract tnr links → scrape detail pages
        │                └── parse date, category, FIDE flag, rating restrictions
        │                └── geocode city via cached Google Maps call
        │
        ├── 10 artifacts (tournaments-{region}.json) uploaded
        │
        └── merge job → merged-tournaments.json → Supabase upsert (onConflict: id)
                     └── scraper_logs (per-region success / per-failure rows for /status)
```

Weekly cron: `0 2 * * 0` (Sunday 02:00 UTC) + manual `workflow_dispatch`.

---

## 1. Why Chess-Results.com

No single FIDE API exposes upcoming open tournaments worldwide. Chess-Results is the de-facto aggregator used by arbiters to publish pairings/results — every tournament gets a `tnrXXXXXX` page with federation, date, location, organizer, and (if provided) time control and rounds. Scraping federation listing pages (`fed.aspx?fed=CODE`) is more stable than scraping a global search.

Source of truth: `scripts/scrape.ts` — the only scraper (`CONTRIBUTING.md` describes how to add a second source under `scripts/scrape-<source>.ts` with a `mysource_` prefixed id).

## 2. Federation coverage and regional sharding

`SCRAPER_CONFIG` tiers federations by chess activity so high-volume countries are prioritized when link collection runs sequentially:

| Tier | Federations | Count |
|------|-------------|-------|
| Top 10 | IND, RUS, USA, GER, CHN, FRA, ESP, NED, ENG, POL | 10 |
| Tier 2 | ITA, AUT, SUI, CZE, HUN, SWE, NOR, DEN, UKR, ARG, BRA, AUS, ISR, TUR, GRE, SRB, CRO, ROU | 18 |
| Others | every remaining FIDE federation the site lists (Finland … Fiji) | ~130 |

Deduplicated via `new Set(feds)` → ~160 distinct `fed` codes in practice. Each code is tried as `?fed=CODE`; `COUNTRY_CODES` (3-letter FIDE → ISO-2) + `lib/countryMap.ts` normalizes the result to `country_code` / `country`.

To keep the 45-minute job timeout safe and to respect Chess-Results rate limits, federations are sharded into 10 regions (`REGION_MAP`):

```
europe-west, europe-east, americas, india,
east-asia, southeast-asia, south-asia,
middle-east-central-asia, oceania, africa-me
```

`--region` filters the fed list to that region's codes only. GitHub Actions runs the 10 shards **in parallel** (`strategy.matrix.region` × 10). Each writes `tournaments-{region}.json`; a `merge` job downloads all 10 artifacts, concatenates them with a small Node snippet, and pushes once via `--push-from`.

Relevant files:

- `scripts/scrape.ts` — `REGION_MAP`, `SCRAPER_CONFIG`, `COUNTRY_CODES`, federation list construction
- `.github/workflows/scrape.yml` — matrix, caching, merge
- `lib/countryMap.ts` — FIDE code → country name/ISO-2 fallback

## 3. Scraper lifecycle (four phases in `main()`)

```ts
// scripts/scrape.ts — main()
Phase 1: Collect links  →  getLinks() per fed → allLinks[]
Phase 2: Scrape detail  →  scrapeTournament() per tnr → ScrapedTournament[]
Phase 3: Geocode        →  geocode() per distinct city,country → lat/lng
Phase 4: Persist        →  pushTournaments() → Supabase upsert  OR  --output JSON
```

### Phase 1 — Collecting links

`getLinks(browser, fed)` opens `https://chess-results.com/fed.aspx?lan=1&fed=${fed}` in Puppeteer, extracts every `a[href*="tnr"]`, normalizes to absolute `https://chess-results.com/...&lan=1`, dedupes with `Set`. Runs **sequentially** per fed with `delayBetweenRequests: 150 ms` to avoid hammering the site.

Filtering after collection:

```ts
const unique = allLinks.filter(l => {
  const id = l.match(/tnr(\d+)/)[1];
  if (seen.has(id) || existingIds.has(`cr_${id}`)) return false; // already in DB
});
```

`existingIds` is `select id from tournaments where id like 'cr_%'` — so reruns are incremental by default. `seen` dedupes cross-federation duplicates (a tournament can appear under two feds).

Flags:

- `--region europe-west` — shard to one region (used by CI)
- `--output file.json` — write instead of pushing (used by CI artifacts)
- `--push-from file.json` — push a pre-merged file (used by the `merge` job)

### Phase 2 — Scraping detail pages

`scrapeTournament(browser, url)`:

1. `goto(fullUrl&turdet=YES)` (`turdet` = tournament details) with `domcontentloaded`, 12 s timeout, 200 ms settle.
2. `page.evaluate` parses:
   - `h2` → `name` (first non-"Chess-Results" heading)
   - `td` label/value pairs → `federation`, `date`, `location`, `organizer`, `time control`, `rounds`
   - `a[href^=http]` whose text contains "official homepage" / "organizer" → `externalLink`
3. Validates: `name && federation && date && parseDate(date)`.
4. `parseDate` handles `YYYY/MM/DD to YYYY/MM/DD` ranges or single dates.
5. Drops past tournaments (`start < today`).
6. Extracts `cr_` id from `tnrXXXXXX`, parses rating restrictions, derives `countryCode`/`country`/`city` (`city = location.split(',')[0]`).

Each page is opened in a fresh `browser.newPage()` and closed in `finally` — no page reuse, so a crash on one tnr does not poison the next.

Error handling: every scrape helper catches and calls `logScraperFailure(source, message)` which inserts a `failed` row into `scraper_logs` without throwing.

### Derived fields

**Category** — `detectCategory(name)` defaults to `Rapid` (the global majority). Multilingual keyword lists promote to `Blitz` or `Classical` only on explicit signals (`blitz`/`bullet`/`bijli`…, `classical`/`standard`/`klassisch`/`classique`…, `rapid`/`schnell`/`rapide`… and Hindi terms `tez`/`jaldi`).

**FIDE-rated** — `detectFideRated(name)` checks for `fide`/`rated`/`elo` and translations (`bewertet`/`gewertet`, `homologué`, `valorado`, `рейтинговый`, …) plus standalone `\belo\b`.

**Rating restrictions** — `parseRatingRestriction(name)` extracts `min_rating`/`max_rating`:

- Range: `1400-1800` / `1400 to 1800`
- Upper bound: `U1600`, `Under 1600`, `Elo < 1600`
- Lower bound: `Over 1800`, `>1800`, `1800+`
- Returns `'unparseable'` (logged, not silently dropped) when restriction-like text near a 3-4 digit number is present but unrecognized, so `FIDE Rated 2025` is not misread.

## 4. Geocoding — 4-tier fallback

The issue description names four tiers; the code splits them across two files:

| Tier | Where | What | Cost/Rate limit |
|------|-------|------|-----------------|
| 1 | `lib/geocoding.ts` → `CITY_COORDINATES` | ~45 hardcoded chess cities (`mumbai`, `saint louis`, `paris`, …) — normalized `city.toLowerCase()` lookup | free, O(1) |
| 2 | `lib/geocoding.ts` → `COUNTRY_COORDINATES` + `lib/geocoding.ts:getCoordinatesFromState` | Country centroid (14 countries) + Indian state centroids (30+ states) as fallback when city unknown | free |
| 3 | `scripts/scrape.ts:geocode()` + `lib/geocoding.ts:geocodeAddress()` | Google Maps Geocoding API (`/maps/api/geocode/json?address=`) | billable, fast |
| 4 | `lib/geocoding.ts:geocodeWithNominatim()` | OpenStreetMap Nominatim (`/search?format=json`) with `User-Agent: TourneyRadar/1.0` and `NOMINATIM_DELAY = 1100 ms` between calls, `geocodeCity`/`geocodeTournaments` batch with dedup | free, rate-limited 1 req/s |

In the **scraper path** (`scripts/scrape.ts`), Phase 3 uses tier 3 only — Google Maps with a per-`city,country` cache (`Map<string, coords|null>`) and 50 ms pacing, setting `lat`/`lng` on the tournament before `pushTournaments`. If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset, Phase 3 is skipped and tournaments are stored without coordinates.

In the **library path** (`lib/geocoding.ts`), `geocodeTournaments(tournaments)` implements the full chain for callers that need local fallback: try `geocodeCity(city, country_code)` (tiers 1+2) synchronously, collect `unknownCities`, then batch them through `geocodeWithNominatim` (tier 4) with deduplication and result caching back into `CITY_COORDINATES`. `geocodeSingleCity` is the single-city entry point for that chain.

Both paths are intentionally split: the scraper must not block on 1 req/s Nominatim for thousands of tournaments (it batches only unknown cities and currently defers to Google), while library consumers that hydrate older rows can afford the slower fallback.

## 5. Persistence and idempotency

`pushTournaments(tournaments)` upserts one row at a time:

```ts
await supabase.from('tournaments').upsert({
  id, name, date, end_date, location, city, state, country, country_code,
  time_control, rounds, organizer_name, source, source_url, external_link,
  lat, lng, status: 'published', category, format: 'Swiss',
  fide_rated, min_rating, max_rating, scraped_at
}, { onConflict: 'id' });
```

`id = cr_${tnr}` is stable, so reruns are idempotent. Single-row upserts sacrifice batch throughput for per-row error isolation — a constraint violation on one tournament does not roll back the batch; it is logged via `scraper_logs` and the loop continues. `saved` is the success count surfaced to the `merge` job and to `logScraperSuccess`.

Schema lives in `supabase/migrations/`; core columns are `tournaments` (one row per event), `players`/`admins` (auth), `player_favorite_tournaments` (wishlist), and observability tables below.

## 6. Orchestration (GitHub Actions)

`.github/workflows/scrape.yml`:

```yaml
on:
  schedule: [{ cron: '0 2 * * 0' }]  # weekly, Sunday 02:00 UTC
  workflow_dispatch:                 # manual re-run per region

jobs:
  scrape:
    strategy:
      matrix: { region: [10 regions] }
      fail-fast: false               # one region failing does not cancel the other 9
    timeout-minutes: 45
    steps:
      - cache: ~/.cache/puppeteer (keyed on package-lock.json)
      - npm ci + puppeteer browsers install chrome
      - run: npm run scrape:ci -- --region ${{matrix.region}} --output tournaments-${{matrix.region}}.json
      - upload-artifact: tournaments-${{matrix.region}}.json

  merge:
    needs: [scrape]
    if: ${{ !cancelled() }}           # runs even if one shard failed
    steps:
      - download all artifacts → artifacts/
      - node -e "concat 10 JSONs → merged-tournaments.json"
      - run: npm run scrape:ci -- --push-from merged-tournaments.json
```

Why not Vercel Cron? `docs/ARCHITECTURE.md` notes Puppeteer + Chromium exceeds Vercel's 10 s function timeout. The Vercel cron at `app/api/cron/scrape-tournaments/route.ts` exists only to log activity; heavy work stays on Actions. `vercel.json` cron (`0 2 * * *` daily) is the lightweight trigger counterpart.

Failure handling: `logScraperFailure` is best-effort — `supabase.from('scraper_logs').insert(...)` wrapped in `try/catch` so a logging failure never crashes the scrape. `logScraperSuccess(region, rowsWritten)` writes `[region:…] success: N tournaments` on completion, surfaced on `/status`.

## 7. Observability

- **`scraper_logs`** table (`supabase/migrations/*scraper_logs*`): rows with `started_at`, `completed_at`, `status` (`success`/`failed`), `message`. Success rows encode region and row count in `message` (`[region:europe-west] success: 42 tournaments`) because the table predates dedicated columns — see `supabase/README.md`.
- **Phase banners**: `═` separators and `✓` counts are plain `console.log` — visible in Actions logs per region.
- **Status page**: reads `scraper_logs` to show per-region freshness (see `app/api/scraper-last-success` and `app/status/page.tsx`).

No external APM — the design trades granularity for durability: even if Supabase is briefly unavailable, the scraper finishes and artifacts are retained (90 days by default via `upload-artifact`).

## 8. Performance and rate-limiting notes

- Puppeteer: `headless: true` + `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage` for Ubuntu runners.
- No cross-fed concurrency within a shard — links for a fed are collected one by one (`delayBetweenRequests: 150 ms`), then detail pages one by one (`setTimeout 100 ms`). Concurrency knob `SCRAPER_CONFIG.concurrentPages: 5` is reserved but not wired — an intentional simplicity choice to avoid Chess-Results throttling.
- Geocoding cache in Phase 3 avoids N× Google calls for same city; many Indian opens share `Mumbai, India`.
- `maxTotal: 2000` caps a run so a site change that suddenly returns 10k links does not explode Supabase writes.

## 9. Known limitations and next steps

- **City parsing is heuristic** — `location.split(',')[0]` fails on `St. Louis, Missouri, USA` style strings; `CITY_COORDINATES` contains hand-added aliases (`st. louis`/`saint louis`) to compensate.
- **Nominatim not on the scraper hot path** — unknown cities without Google key end up without coordinates; wiring `lib/geocoding.ts:geocodeTournaments` into the scraper's unknown-city set would close that gap at the cost of 1 req/s pacing.
- **Single-row upserts** — slower than batch but gives per-row observability; switching to `.upsert(rows, {onConflict:'id'})` is viable once error handling is batched.
- **No append-only history** — reruns overwrite rows; historical trajectory (issue #125) would need a separate `tournaments_history` table.

---

### File map

| File | Role |
|------|------|
| `scripts/scrape.ts` | Puppeteer scraper, region map, category/FIDE/rating parsers, 3-tier geocode + Supabase push |
| `lib/geocoding.ts` | City/country hardcode tables, state centroids, Nominatim rate-limited fallback, `geocodeTournaments` batch |
| `lib/countryMap.ts` | FIDE 3-letter → ISO-2 mapping used by `getCountryCode` |
| `.github/workflows/scrape.yml` | 10-way matrix + merge job, weekly cron |
| `app/api/cron/scrape-tournaments/route.ts` | Vercel cron shim (logs only) |
| `vercel.json` | Cron schedule + headers |
| `supabase/migrations/*scraper_logs*` | Observability table DDL |

Contributions that touch scraping should run `npm run scrape -- --region india --output /tmp/out.json` locally (requires `.env.local` with Supabase + Google keys) and keep the `CITY_COORDINATES` / `COUNTRY_CODES` tables in sync with any new federation added to `REGION_MAP`.
