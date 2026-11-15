-- Organizer self-submission (issue #238).
--
-- A submitted tournament is a normal `tournaments` row with status 'pending'.
-- tournaments_published_read already hides every status except 'published' from
-- anon and authenticated, so a pending row is invisible to visitors until a
-- moderator publishes it (scripts/review-submissions.ts). The submitting route
-- writes with the service role, so no new write policy is opened on
-- `tournaments`: the first unauthenticated-or-self-service write path into that
-- table still goes through server code that validates and rate-limits.
--
-- This table records who submitted what, for the daily cap and so a moderator
-- can contact the submitter. Service role only. It is not a column on
-- tournaments because tournaments is publicly readable once published, and the
-- submitter's identity must not be.
--
-- submitted_by is set null when the player deletes their account (#253), so the
-- pending row stays reviewable without pointing at a deleted person.

begin;

create table if not exists public.tournament_submissions (
    id uuid primary key default gen_random_uuid(),
    tournament_id text not null unique references public.tournaments(id) on delete cascade,
    submitted_by uuid references public.players(id) on delete set null,
    created_at timestamptz not null default now(),
    reviewed_at timestamptz,
    review_note text
);

create index if not exists tournament_submissions_submitter_created_idx
    on public.tournament_submissions (submitted_by, created_at desc);

alter table public.tournament_submissions enable row level security;
revoke all on public.tournament_submissions from anon, authenticated;

comment on table public.tournament_submissions is
    'Who submitted each organizer-submitted tournament (issue #238). Service role only.';

commit;
