-- Feedback widget submissions (replaces the GitHub star nudge).
--
-- Deliberately no RLS policies: anonymous feedback is the point, and per
-- supabase/README.md tables without policies are world-insertable with the
-- anon key (which ships in the client bundle by design). player_id is
-- nullable so anonymous visitors can submit; signed-in players get their
-- players.id attached, and a delete on the player nulls it out.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  player_id uuid references public.players(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  page_url text not null,
  created_at timestamptz not null default now()
);
