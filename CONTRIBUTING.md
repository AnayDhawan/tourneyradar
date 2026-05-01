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
The admin panel is not open source — all other routes work locally.

---

## Adding a new data source

The scraper lives in `scripts/scrape.ts`. To add a new source:

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

| Field | Type | |
|-------|------|-|
| `id` | string | source-prefixed, stable |
| `name` | string | |
| `date` | string | YYYY-MM-DD |
| `end_date` | string | YYYY-MM-DD |
| `country` | string | full English name |
| `country_code` | string | ISO 3166-1 alpha-2 |
| `category` | string | Classical / Rapid / Blitz |
| `status` | string | always `published` |
| `source_url` | string | direct link to tournament page |

---

## Code style

- Strict TypeScript — must pass `npm run build`
- No `any`
- No hardcoded secrets
- No `console.log` in API routes or `lib/` files

---

## PR guidelines

- One PR per change
- Scraper PRs must include a working example URL
- AI-assisted PRs welcome — review and test before submitting

---

## Open ideas

- Email alerts for new tournaments in your country
- ICS calendar export
- Rating range filter
- Tournament reviews
- Mobile app using the public API
