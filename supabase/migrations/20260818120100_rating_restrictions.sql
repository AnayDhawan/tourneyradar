-- Add nullable rating restriction columns to tournaments.
--
-- The Chess-Results scraper (scripts/scrape.ts) parses rating restrictions
-- out of tournament names — "U1600", "Under 1600", "1400-1800", "Elo < 1600"
-- — and stores the bounds here. Nullable: most tournaments state no
-- restriction, and unrecognised restriction text is logged rather than
-- guessed at.

alter table public.tournaments
  add column if not exists min_rating integer,
  add column if not exists max_rating integer;