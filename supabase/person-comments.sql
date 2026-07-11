-- ============================================================
-- Watchruum · Per-actor comments (People discussion)
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor),
-- BEFORE deploying the actor-comments code. Safe to re-run (idempotent).
--
-- Adds a person_comments table keyed by an actor's TMDb id, and extends the
-- reactions/target_type check so likes work on person comments too.
-- ============================================================

create table if not exists person_comments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  person_tmdb_id integer not null,
  person_name    text,
  body           text not null,
  has_spoiler    boolean not null default false,
  created_at     timestamptz default now()
);

create index if not exists idx_person_comments
  on person_comments (person_tmdb_id, created_at desc);

alter table person_comments enable row level security;

drop policy if exists "public read person comments" on person_comments;
create policy "public read person comments" on person_comments
  for select using (true);

drop policy if exists "write own person comments" on person_comments;
create policy "write own person comments" on person_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "delete own person comments" on person_comments;
create policy "delete own person comments" on person_comments
  for delete using (auth.uid() = user_id);

-- Let the existing reactions table accept likes on person comments.
alter table reactions drop constraint if exists reactions_target_type_check;
alter table reactions add constraint reactions_target_type_check
  check (target_type in ('comment', 'review', 'person_comment'));
