-- Self-reported profile fields for the onboarding flow's new Step 0.
--
-- Nullable, same reasoning as 20260818120000: existing rows and the
-- client-side registration insert (which sends none of these) keep
-- working unchanged. "admin" in this schema is TR's own data/scraper
-- admin, not "tournament organizer" -- user_role is a fresh self-reported
-- attribute, not a reuse of that distinction.

alter table public.players add column if not exists user_role text;
alter table public.players add column if not exists referral_source text;
alter table public.players add column if not exists usage_reason text;
