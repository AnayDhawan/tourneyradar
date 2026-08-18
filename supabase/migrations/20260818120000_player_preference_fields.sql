-- Location and notification-preference fields for the players table.
--
-- Foundation for the player onboarding flow. All columns are nullable so
-- existing rows and the client-side registration insert (which sends none
-- of these fields) keep working unchanged.

alter table public.players add column if not exists home_country_code text;
alter table public.players add column if not exists home_state text;
alter table public.players add column if not exists notify_frequency text;
alter table public.players add column if not exists notify_categories text[];
alter table public.players add column if not exists min_fide_rated boolean;
