-- Feedback widget submissions (replaces the GitHub star nudge).
--
-- player_id is nullable so anonymous visitors can submit; signed-in players
-- get their players.id attached, and a delete on the player nulls it out.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  player_id uuid references public.players(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  page_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

-- Submissions arrive from the browser with the anon key, from anonymous
-- visitors and signed-in players alike, so insert is open. Nothing else is.
--
-- An earlier draft of this file left RLS off on the reasoning that anonymous
-- submission was the point. That is only half the consequence: per
-- supabase/README.md, a table reachable with the anon key and no policy is
-- world-READABLE and world-WRITABLE, so leaving RLS off would have published
-- every comment and its player_id to anyone who opened the JS bundle, and let
-- them update or delete the whole table. RLS on with an insert-only policy
-- gives the intended behaviour and nothing more. The admin dashboard and any
-- dashboard SQL query use the service role, which bypasses RLS.
alter table public.feedback enable row level security;

-- The player_id predicate stops a caller attributing feedback to someone
-- else. It is spelled out inline rather than calling current_player_id(),
-- so this migration applies cleanly whether or not 20260729120000 has run.
drop policy if exists "anyone can submit feedback" on public.feedback;
create policy "anyone can submit feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (
    player_id is null
    or exists (
      select 1 from public.players p
      where p.id = player_id and p.auth_user_id = auth.uid()
    )
  );
