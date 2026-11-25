# Second data source: findings

Spike for issue #264. Measured 2026-11-25. Counts compare each candidate against the live `tournaments` table (published rows, start date on or after 2026-11-25). Nothing was written to the database and no scraper was built.

## Recommendation

Add the English Chess Federation calendar first. It has a public JSON API, 211 upcoming in-person events against 25 England, Scotland and Wales rows in TourneyRadar today, and about five requests cover all of it.

The larger gap is the United States (1 upcoming US row in TourneyRadar), but USCF blocks scripted requests and has no public API, so it needs permission before any work. FIDE's own calendar is not worth the effort.

## Gap in the current data

| Area | Upcoming rows in TourneyRadar |
|---|---|
| All countries | 1,004 |
| United States | 1 |
| Great Britain (England 19, Scotland 4, Wales 2) | 25 |

Chess-Results covers national federations unevenly. The US and England are the two places where the gap is easy to see.

## Candidates

### English Chess Federation (englishchess.org.uk): do this one

- **Feed:** the site runs The Events Calendar plugin and exposes its REST API publicly: `https://www.englishchess.org.uk/wp-json/tribe/events/v1/events?start_date=YYYY-MM-DD&per_page=50&page=N`. Returns JSON with `total` and `total_pages`.
- **Volume:** 218 events from 2026-11-25, 211 after dropping online events. That is 5 pages at 50 per page. Fetched with a 2 second pause between pages, all returned 200.
- **Overlap with what we have:** only 3 of the 211 matched an existing row on exact start date plus city. The match was strict, but 25 rows cannot cover 211 events, so most of this is new.
- **Fields available** and where they would go:

| ECF field | TourneyRadar column |
|---|---|
| `title` | `name` |
| `start_date`, `end_date` | `date`, `end_date` |
| `venue.city`, `venue.address` | `city`, location text |
| `venue.geo_lat`, `venue.geo_lng` (159 of 218 have them) | `lat`, `lng`; geocode the rest |
| `categories` slug `fide-rated` (153 of 218) | `fide_rated` |
| `categories` slug `online`, `is_virtual` | skip these rows |
| `website` (202 of 218) | `external_link` |
| `url` | `source_url` |
| `cost` | not stored today |
| time control | only in the free-text `description` ("45 minutes plus 15 second increment"); there is no structured field, so `category` would be null unless parsed |

- **Country:** the sample venue had `country: null`. Everything on this feed is England, so set the country from the source, not from the row.
- **Terms:** `robots.txt` allows `User-agent: *` and carries `Content-Signal: search=yes, ai-train=no, use=reference`. A search directory that links back to the ECF page fits that. Named AI-training crawlers are disallowed, and this scraper is not one. Terms of use were not found; this is not legal advice. Send the ECF a short note before shipping, and show "via the English Chess Federation" with the link on each row.
- **Dedup:** an event listed on both Chess-Results and the ECF would appear twice. `lib/dedup.ts` already merges on name, date and location similarity; use an `ecf_` id prefix (the convention in `CONTRIBUTING.md`) and run the same dedup.
- **Ban risk:** very low. One run is about five requests, weekly.

### USCF (US Chess, MSA tournament calendar): biggest gap, blocked

- Plain HTTP requests to `uschess.org`, `new.uschess.org` and `uschess.org/msa` return 403 here, including `robots.txt`. A normal browser may get through, but a scraper that depends on getting past a block is the kind that gets banned.
- No public API found. A US Chess forum post says an API with keys is planned, undated.
- Terms of use text was not found.
- Next step is a message to US Chess asking for calendar data access. Do not scrape it.

### FIDE calendar (calendar.fide.com, events.fide.com): skip

- `events.fide.com` is WordPress without the events-calendar API (`/wp-json/tribe/...` returns 404); no other data feed was found.
- It lists FIDE-sanctioned events (circuits, championships), a small set that does not fill the open-tournament gap.
- Terms not found.

## Next steps

1. File an ingestion issue for the ECF feed: `scripts/scrape-ecf.ts`, `ecf_` ids, skip online events, set country from the source, geocode missing coordinates, run through the existing dedup, weekly in the same workflow.
2. Email the ECF before the first public run.
3. Email US Chess about calendar data access.

## Method and limits

- ECF figures come from one pull on 2026-11-25 (`start_date=2026-11-25`). Counts change daily.
- The overlap check was exact start date plus city text, which undercounts matches (city spelling differs). It does not change the conclusion, since 25 existing rows cannot cover 211 events.
- robots.txt and public pages were checked. Terms of use pages were not found for any candidate, so no source is cleared legally.
