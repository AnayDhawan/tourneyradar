## What does this PR do?

<!-- A short description of the change -->

## Type of change

- [ ] Bug fix
- [ ] New scraper source
- [ ] Feature / enhancement
- [ ] Refactor / cleanup

## For new scrapers

- [ ] Script is in `scripts/scrape-<source>.ts`
- [ ] Uses `countryNameToCode()` from `lib/countryMap.ts` to set `country_code`
- [ ] Uses a stable, source-prefixed ID (e.g. `lichess_abc123`)
- [ ] Does not hardcode any credentials
- [ ] Example tournament URL scraped successfully:

## Checklist

- [ ] TypeScript compiles with no errors (`npm run build`)
- [ ] No `any` types introduced
- [ ] No credentials or secrets in the code
