# Contributing to TourneyRadar

Thank you for helping make chess tournament discovery better for everyone.

---

## How to add a new scraper source

Each scraper is a standalone TypeScript script in `scripts/`. The existing reference is `scripts/scrape.ts`.

### Step-by-step

1. **Create `scripts/scrape-<source>.ts`**

   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import { countryNameToCode } from '../lib/countryMap';

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY! // always service key for writes
   );
   ```

2. **Generate a stable, source-prefixed ID** for every tournament so duplicates are handled by upsert:

   ```typescript
   id: `lichess_${tournament.id}`  // e.g. "lichess_abc123"
   ```

3. **Map the country** — always set both `country` (full name) and `country_code` (ISO 2-letter):

   ```typescript
   import { countryNameToCode } from '../lib/countryMap';

   country: 'Germany',
   country_code: countryNameToCode('Germany') ?? 'DE',
   ```

4. **Write to the `tournaments` table** using upsert so re-runs are idempotent:

   ```typescript
   await supabase.from('tournaments').upsert({
     id,
     name,
     date,          // YYYY-MM-DD
     end_date,      // YYYY-MM-DD
     city,
     country,
     country_code,
     category,      // 'Classical' | 'Rapid' | 'Blitz'
     status: 'published',
     source: 'your-source-name',
     source_url,
     fide_rated,    // use detectFideRated(name) pattern from scrape.ts
     scraped_at: new Date().toISOString(),
   }, { onConflict: 'id' });
   ```

5. **Add a script entry** in `package.json`:

   ```json
   "scrape:lichess": "npx tsx --env-file=.env.local scripts/scrape-lichess.ts"
   ```

6. **Open a PR** — see PR guidelines below.

### Required fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable, source-prefixed |
| `name` | string | Tournament name |
| `date` | string | Start date `YYYY-MM-DD` |
| `end_date` | string | End date `YYYY-MM-DD` |
| `country` | string | Full English country name |
| `country_code` | string | ISO 3166-1 alpha-2 via `countryNameToCode()` |
| `category` | string | `'Classical'`, `'Rapid'`, or `'Blitz'` |
| `status` | string | `'published'` |
| `source` | string | Your source identifier |
| `source_url` | string | Direct URL to the tournament page |

---

## Code style

- **TypeScript strict mode** is enabled (`strict: true` in `tsconfig.json`). All new code must type-check cleanly (`npm run build`).
- **No `any`** — use `unknown` and narrow it, or define a proper interface.
- **No `console.log` in production paths** — API routes and `lib/` files must not log. Scraper scripts may use `console.log` and `process.stdout.write` for progress output.
- **No hardcoded credentials** — all secrets come from environment variables. Never commit a `.env.local` file.

---

## PR guidelines

- Keep PRs focused: one scraper or one fix per PR.
- Scraper PRs must include the source URL and an example tournament URL that was successfully scraped.
- If the source has rate limits or ToS concerns, mention them in the PR description.
- Bug fix PRs should include a short description of what was wrong and what the fix does.
- AI-generated PRs are welcome, provided the contributor has reviewed, tested, and verified the output themselves before submitting.

---

## Feature Ideas

These are open for community contributions. Pick one up, open an issue to claim it, then submit a PR.

- **User accounts / wishlist sync across devices** — currently wishlist is per-device
- **Email / push notifications** — alert users when new tournaments appear in their country
- **Calendar export (ICS)** — let users add tournaments to Google Calendar / Apple Calendar
- **Mobile app** — React Native wrapper around the existing API
- **Rating filter** — show only tournaments that accept players above/below a given rating
- **Tournament reviews** — players can leave a star rating and comment after attending
- **Organizer profiles** — verified badge for known organizers, direct contact
- **Multi-language UI (i18n)** — Spanish, French, German, Russian interface translations
- **Tournament result submission** — organizers can submit final standings after completion
