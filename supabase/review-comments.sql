-- =====================================================================
--  Watchruum — Threaded replies on reviews
--  Run in the Supabase SQL editor.
--
--  Adds a comment/reply thread under each review so the reviews wall
--  matches the "Comments" mock: every review card gets a reply count and
--  an expandable list of replies. Replying notifies the review author via
--  the notify() fan-out (in-app + push).
--
--  `user_id` references profiles(id) (the 1:1 mirror of auth.users) so
--  PostgREST can embed `author:profiles(...)` without the PGRST200 trap.
-- =====================================================================

create table if not exists review_comments (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references reviews(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists review_comments_review_idx
  on review_comments (review_id, created_at);

-- =====================================================================
--  Row Level Security — anyone signed in reads replies; you create and
--  delete only your own.
-- =====================================================================
alter table review_comments enable row level security;

drop policy if exists "review comments read" on review_comments;
create policy "review comments read" on review_comments for select using (true);

drop policy if exists "review comments insert own" on review_comments;
create policy "review comments insert own" on review_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "review comments delete own" on review_comments;
create policy "review comments delete own" on review_comments
  for delete using (auth.uid() = user_id);
