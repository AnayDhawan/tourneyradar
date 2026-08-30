# Scraping Architecture

> Deep-dive into how TourneyRadar aggregates over-the-board tournaments from [Chess-Results.com](https://chess-results.com) across 140+ federations. Intended for contributors and anyone curious how a small open-source project stays fresh worldwide without paid data feeds.

## TL;DR

```
Chess-Results.com (fed.aspx?fed=IND … fed=GER …)
        │
        ├── 10 GitHub Actions matrix jobs (one per region, 45 min timeout each)
        │       └── Puppeteer → fetch fed page → extract tnr links → scrape detail pages
        │                └── parse date, category, FIDE flag, rating restrictions
        │                └── geocode city via 4-tier fallback (city table → country centroid → Google → Nominatim)
        │
        ├── 10 artifacts (tournaments-{region}.json) uploaded
        │
        └── merge job → merged-tournaments.json → fuzzy dedup across federations
                     → Supabase upsert (onConflict: id) → tournament_history trigger
                     └── scraper_logs (region/federation/dedup/geocode-tier rows for /status, /status/detail)
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

**Update (issue #126):** the split described above was true through 2026-08-30 but no longer is. Phase 3 previously had its own separate, simpler `geocode()` (Google-only, no fallback) while `lib/geocoding.ts`'s 4-tier chain sat unused — dead code relative to the live pipeline. Phase 3 now calls `geocodeWithFallback(city, country, country_code)` directly, so all four tiers are live in production, and each result carries a `tier` field recording which one resolved it (`'city_table' | 'country_centroid' | 'google' | 'nominatim'`). A per-run tally is logged to `scraper_logs` via `logGeocodeTierSummary` (message shape `[geocode_tier] city_table:N country_centroid:N google:N nominatim:N unresolved:N`), surfaced on the observability dashboard (see section 7). `geocodeTournaments`/`geocodeSingleCity` remain the entry points for library consumers hydrating older rows outside the scraper's own run.

Nominatim's 1 req/s pacing (`NOMINATIM_DELAY = 1100 ms`) is now a real cost on the scraper's hot path for any city that misses both hardcoded tiers and isn't resolved by Google, not just a theoretical one — worth watching run duration if a batch of unusual-city tournaments comes through in one run.

## 5. Deduplication, persistence, and history

**Cross-source dedup (issue #124), new since 2026-08-30.** The same tournament can appear under two different `cr_` ids when a federation site and a regional sub-site both list it. Before either the merge job's `--push-from` path or a local full `npm run scrape` pushes, `dedupeTournaments()` (`lib/dedup.ts`) scores every pair on name similarity (hand-rolled Levenshtein, normalized 0–1), date proximity (exact `start_date` = 1.0, within ±1 day = 0.6, else 0), and location (same city + country_code = 1.0, same country_code with high name similarity but differing city formatting = 0.9, differing country_code = 0). The weighted combination (`0.5*name + 0.3*date + 0.2*location`) against a `DUPLICATE_SCORE_THRESHOLD` of 0.85 decides a match; matched tournaments are grouped (transitively, via union-find), and the most complete row in each group (geocoded, has organizer/external link, longer name, in that order) is kept. A summary is logged to `scraper_logs` via `logDedupSummary` (`[dedup] merged N duplicate tournament(s): ...`). Per-region CI output (`--output`) is left un-deduped on purpose — dedup only runs where a full merged list actually exists, since that's where cross-region/cross-federation duplicates surface.

`pushTournaments(tournaments)` then upserts one row at a time:

```ts
await supabase.from('tournaments').upsert({
  id, name, date, end_date, location, city, state, country, country_code,
  time_control, rounds, organizer_name, source, source_url, external_link,
  lat, lng, status: 'published', category, format: 'Swiss',
  fide_rated, min_rating, max_rating, scraped_at
}, { onConflict: 'id' });
```

`id = cr_${tnr}` is stable, so reruns are idempotent. Single-row upserts sacrifice batch throughput for per-row error isolation — a constraint violation on one tournament does not roll back the batch; it is logged via `scraper_logs` and the loop continues. `saved` is the success count surfaced to the `merge` job and to `logScraperSuccess`.

**Append-only history (issue #125), new since 2026-08-30.** Every upsert used to be destructive: a `tournaments` row's prior state was gone the moment a later run overwrote it. A `tournament_history` table (migration `20260830120200_tournament_history_table.sql`) now captures every version via an `after insert or update on tournaments` trigger (`record_tournament_history()`, `security definer`), storing a full `jsonb` snapshot of the row plus `recorded_at`. This is a database-level trigger, not scraper code, so it also captures writes from the (separate, closed-source) admin panel, not just `pushTournaments`. Public-read RLS, no direct write policy for any role, the trigger writes regardless of who wrote to `tournaments`.

Schema lives in `supabase/migrations/`; core columns are `tournaments` (one row per event), `tournament_history` (append-only snapshots), `players`/`admins` (auth), `player_favorite_tournaments` (wishlist), and observability tables below.

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

- **`scraper_logs`** table (`supabase/migrations/*scraper_logs*`): rows with `started_at`, `completed_at`, `status` (`success`/`failed`/`completed`), `message`. Region, per-federation, dedup, and geocode-tier data all ride in `message` (`[region:europe-west] success: 42 tournaments`, `[fed:eng] success: 12 tournaments found`, `[dedup] merged N duplicate tournament(s): ...`, `[geocode_tier] city_table:N country_centroid:N google:N nominatim:N unresolved:N`) because the table predates dedicated columns — see `supabase/README.md`.
- **Phase banners**: `═` separators and `✓` counts are plain `console.log` — visible in Actions logs per region.
- **Status page** (`app/status/page.tsx`): reads `scraper_logs` to show per-region freshness (see `app/api/scraper-last-success`).
- **Status detail page** (`app/status/detail/page.tsx`, issue #126, new since 2026-08-30): a richer internal-facing view built on the same table — per-federation success rate (not just per-region), a currently-failing-federations alert list with the last failure reason, and the geocoding tier-usage breakdown described in section 4. There is no admin-auth layer in this repo (the admin panel is a separate, closed-source deployment per `CONTRIBUTING.md`), so this page is public like `/status`, just more detailed.

No external APM — the design trades granularity for durability: even if Supabase is briefly unavailable, the scraper finishes and artifacts are retained (90 days by default via `upload-artifact`).

## 8. Performance and rate-limiting notes

- Puppeteer: `headless: true` + `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage` for Ubuntu runners.
- No cross-fed concurrency within a shard — links for a fed are collected one by one (`delayBetweenRequests: 150 ms`), then detail pages one by one (`setTimeout 100 ms`). Concurrency knob `SCRAPER_CONFIG.concurrentPages: 5` is reserved but not wired — an intentional simplicity choice to avoid Chess-Results throttling.
- Geocoding cache in Phase 3 avoids N× Google calls for same city; many Indian opens share `Mumbai, India`.
- `maxTotal: 2000` caps a run so a site change that suddenly returns 10k links does not explode Supabase writes.

## 9. Known limitations and next steps

- **City parsing is heuristic** — `location.split(',')[0]` fails on `St. Louis, Missouri, USA` style strings; `CITY_COORDINATES` contains hand-added aliases (`st. louis`/`saint louis`) to compensate.
- **Single-row upserts** — slower than batch but gives per-row observability; switching to `.upsert(rows, {onConflict:'id'})` is viable once error handling is batched.
- **Dedup threshold is a fixed constant, not tuned against labeled data** — `DUPLICATE_SCORE_THRESHOLD = 0.85` (section 5) was chosen by inspection of a few known-duplicate/known-distinct pairs, not a labeled dataset; worth revisiting if false merges or missed duplicates show up in practice.
- **History is per-row snapshots, not a queryable time series yet** — `tournament_history` (section 5) captures every version as `jsonb`, which is enough to reconstruct "what did this row look like on date X" but nothing yet aggregates it into trend views; that's a separate future feature, not part of #125's own scope.

Resolved since the version of this doc that shipped with issue #129: geocoding's 4-tier fallback is now live on the scraper's hot path (was previously dead code, see section 4), and reruns no longer silently lose history (see section 5, issue #125).

---

### File map

| File | Role |
|------|------|
| `scripts/scrape.ts` | Puppeteer scraper, region map, category/FIDE/rating parsers, dedup + 4-tier geocode + Supabase push |
| `lib/dedup.ts` | Cross-federation fuzzy-match dedup (name/date/location scoring, union-find grouping) |
| `lib/geocoding.ts` | City/country hardcode tables, state centroids, Google Maps + Nominatim fallback, `geocodeWithFallback`/`geocodeTournaments` |
| `lib/countryMap.ts` | FIDE 3-letter → ISO-2 mapping used by `getCountryCode` |
| `.github/workflows/scrape.yml` | 10-way matrix + merge job, weekly cron |
| `app/api/cron/scrape-tournaments/route.ts` | Vercel cron shim (logs only) |
| `vercel.json` | Cron schedule + headers |
| `supabase/migrations/*scraper_logs*` | Observability table DDL |
| `supabase/migrations/*tournament_history*` | Append-only history table + trigger DDL |
| `app/status/detail/page.tsx` | Per-federation/geocode-tier observability dashboard |

Contributions that touch scraping should run `npm run scrape -- --region india --output /tmp/out.json` locally (requires `.env.local` with Supabase + Google keys) and keep the `CITY_COORDINATES` / `COUNTRY_CODES` tables in sync with any new federation added to `REGION_MAP`.
