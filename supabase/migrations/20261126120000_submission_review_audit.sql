-- Moderation dashboard audit trail (issue #263).
--
-- tournament_submissions already records when a submission was reviewed
-- (reviewed_at) and an optional note (review_note). The dashboard at
-- /admin/submissions also needs to say what was decided and by whom, so this
-- adds:
--
--   decision       'approved' or 'rejected'
--   reviewed_by    the auth user (an admins.auth_user_id) who decided. Null for
--                  the CLI (it runs with the service role key and has no
--                  signed-in user) and set null if that user is later deleted,
--                  so the trail never blocks an account deletion
--   review_source  'dashboard' or 'cli', so a null reviewed_by is explained
--
-- reviewed_by points at auth.users rather than players because an admin is
-- identified by admins.auth_user_id and need not have a players row.
--
-- The table stays service-role only (RLS enabled, no policy, no grants for anon
-- or authenticated), so the new columns need no policy of their own.
--
-- Not applied automatically. The dashboard and the CLI both write these columns;
-- the CLI falls back to the old columns until this runs, the dashboard needs it.

begin;

alter table public.tournament_submissions
    add column if not exists decision text,
    add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
    add column if not exists review_source text;

alter table public.tournament_submissions
    drop constraint if exists tournament_submissions_decision_check,
    add constraint tournament_submissions_decision_check
        check (decision is null or decision in ('approved', 'rejected'));

alter table public.tournament_submissions
    drop constraint if exists tournament_submissions_review_source_check,
    add constraint tournament_submissions_review_source_check
        check (review_source is null or review_source in ('dashboard', 'cli'));

-- Everything reviewed so far went through the CLI. Fill in what the tournament's
-- current status says, and leave the rest null rather than guess (a row that was
-- published and later hidden as invalid_date was still approved once, but this
-- table cannot prove it).
update public.tournament_submissions s
   set decision = case t.status when 'published' then 'approved' when 'rejected' then 'rejected' end,
       review_source = 'cli'
  from public.tournaments t
 where t.id = s.tournament_id
   and s.reviewed_at is not null
   and s.decision is null;

comment on column public.tournament_submissions.decision is
    'approved or rejected. Set with reviewed_at (issue #263).';
comment on column public.tournament_submissions.reviewed_by is
    'auth.users id of the admin who decided. Null for the CLI or a deleted admin.';
comment on column public.tournament_submissions.review_source is
    'dashboard (/admin/submissions) or cli (npm run review:submissions).';

commit;
