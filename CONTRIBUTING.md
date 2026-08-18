# Contributing

Thanks for your interest in TourneyRadar.

---

## Setup

```bash
git clone https://github.com/AnayDhawan/tourneyradar.git
cd tourneyradar
npm install
cp .env.local.example .env.local
npm run dev
```

You will need your own Supabase project and Google Maps API key.
The admin panel is not open source. All other routes work locally.

---

## Adding a new data source

The biggest way to contribute is adding a new tournament data source.
Chess-Results is the current only source, but FIDE, national federation
websites, and Lichess broadcast data are all viable additions.

**Propose it first.** Open a [Discussion](https://github.com/AnayDhawan/tourneyradar/discussions)
or file a [New scraper source](./.github/ISSUE_TEMPLATE/new_scraper.md) issue before
writing the scraper, so feasibility and coverage get a look before you spend time on it.

See the README's [Contributing a data source](./README.md#contributing-a-data-source)
section for a worked example covering both extension points below.

The scraper lives in `scripts/scrape.ts` (federation code list + region mapping).
New federations usually also need an entry in `lib/countryMap.ts` (country name to
ISO code mapping) if the country isn't already covered. To add a new source:

**1. Create `scripts/scrape-<source>.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**2. Use a stable source-prefixed ID**

```typescript
id: `mysource_${tournament.id}`
```

**3. Upsert to tournaments**

```typescript
await supabase.from('tournaments').upsert({
  id,
  name,
  date,           // YYYY-MM-DD
  end_date,       // YYYY-MM-DD
  city,
  country,        // full name e.g. "India"
  country_code,   // ISO alpha-2 e.g. "IN"
  category,       // 'Classical' | 'Rapid' | 'Blitz'
  status: 'published',
  source: 'mysource',
  source_url,
  fide_rated,
  scraped_at: new Date().toISOString(),
}, { onConflict: 'id' });
```

**4. Add to package.json**

```json
"scrape:mysource": "npx tsx --env-file=.env.local scripts/scrape-mysource.ts"
```

**5. Open a PR** with an example tournament URL that scraped successfully.

### Required fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | source-prefixed, stable across runs |
| `name` | string | tournament name |
| `date` | string | YYYY-MM-DD |
| `end_date` | string | YYYY-MM-DD |
| `country` | string | full English name e.g. "India" |
| `country_code` | string | ISO 3166-1 alpha-2 e.g. "IN" |
| `category` | string | Classical / Rapid / Blitz |
| `status` | string | always `published` |
| `source_url` | string | direct link to tournament page |

---

## Other good first contributions

**Data quality**
- Fix tournaments showing in the wrong city on the map
- Improve time control detection (Classical vs Rapid vs Blitz inference)
- Add missing federation codes to the scraper country list

**Map and UI**
- Add a date range filter to the map
- Add a rating range filter (show tournaments for players above/below a rating)
- Improve mobile layout of the tournament list
- Dark/light mode toggle

**Player features**
- Email notifications when new tournaments appear in a saved country
- ICS calendar export so players can add tournaments to Google/Apple Calendar
- Share a tournament via link with pre-filled filters

**API**
- Add a `GET /v1/tournaments/search?q=` full-text search endpoint
- Add a `GET /v1/organizers/:id` endpoint
- Client libraries: a Python wrapper, a JS/TS SDK

**Infrastructure**
- Add Playwright end-to-end tests for the map page
- Add a staging environment with a separate Supabase project
- Improve scraper error reporting: log failures to a Supabase table

---

## Code style

- Strict TypeScript: all code must pass `npm run build`
- No `any`: use `unknown` and narrow, or define a proper interface
- No hardcoded secrets: all values via environment variables
- No `console.log` in API routes or `lib/`. Scraper scripts may log freely.

---

## Commit format

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>
```

Common types:

| Type | When to use |
|------|-------------|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change with no behaviour change |
| `chore:` | Tooling, deps, config |
| `revert:` | Reverting a prior commit |

Examples:
```
feat: add FIDE scraper
fix: correct country code for Serbia
docs: add calendar export to good first contributions
```

Non-conforming commits will be requested to change before merge.

---

## PR guidelines

- **Submit all PRs as drafts.** Mark ready for review only when the work is complete and tested. Regular (non-draft) PRs will be converted to drafts.
- One PR per change. Keep scope tight.
- Scraper PRs must include a working example URL that was successfully scraped
- If the source has rate limits or ToS restrictions, mention them in the PR
- AI-assisted PRs are welcome, provided you have reviewed and tested the output
