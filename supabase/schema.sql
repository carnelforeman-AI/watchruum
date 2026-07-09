-- =====================================================================
--  Watchruum — Postgres schema for Supabase
--  Run in the Supabase SQL editor, or via `supabase db push`.
--  Includes tables, indexes, Row Level Security, and a signup trigger.
-- =====================================================================

-- Extensions -----------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums ---------------------------------------------------------------
do $$ begin
  create type media_type as enum ('movie', 'tv');
exception when duplicate_object then null; end $$;

do $$ begin
  create type spoiler_scope as enum ('none', 'episode', 'season', 'series');
exception when duplicate_object then null; end $$;

do $$ begin
  create type follow_target as enum ('media', 'user');
exception when duplicate_object then null; end $$;

-- =====================================================================
--  profiles  (1:1 with auth.users)
-- =====================================================================
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null,
  avatar_url    text,
  bio           text,
  favorite_genres text[] default '{}',
  is_admin      boolean default false,
  onboarded     boolean default false,
  created_at    timestamptz default now()
);

-- =====================================================================
--  media_items  (mirror of selected TMDb titles)
-- =====================================================================
create table if not exists media_items (
  id            uuid primary key default gen_random_uuid(),
  tmdb_id       integer not null,
  media_type    media_type not null,
  title         text not null,
  overview      text,
  poster_url    text,
  backdrop_url  text,
  release_year  integer,
  genres        text[] default '{}',
  vote_average  numeric(3,1) default 0,
  number_of_seasons integer,
  created_at    timestamptz default now(),
  unique (tmdb_id, media_type)
);

-- =====================================================================
--  seasons
-- =====================================================================
create table if not exists seasons (
  id            uuid primary key default gen_random_uuid(),
  media_id      uuid not null references media_items(id) on delete cascade,
  season_number integer not null,
  name          text,
  episode_count integer default 0,
  overview      text,
  unique (media_id, season_number)
);

-- =====================================================================
--  episodes
-- =====================================================================
create table if not exists episodes (
  id             uuid primary key default gen_random_uuid(),
  media_id       uuid not null references media_items(id) on delete cascade,
  season_number  integer not null,
  episode_number integer not null,
  name           text,
  overview       text,
  air_date       date,
  still_url      text,
  runtime        integer,
  unique (media_id, season_number, episode_number)
);

-- =====================================================================
--  watch_status  (progress + watchlist per user/title)
-- =====================================================================
create table if not exists watch_status (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  media_id       uuid not null references media_items(id) on delete cascade,
  season_number  integer,
  episode_number integer,
  movie_watched  boolean default false,
  in_watchlist   boolean default false,
  updated_at     timestamptz default now(),
  unique (user_id, media_id)
);

-- Per-episode watched log (fine-grained) --------------------------------
create table if not exists episode_watches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  media_id       uuid not null references media_items(id) on delete cascade,
  season_number  integer not null,
  episode_number integer not null,
  watched_at     timestamptz default now(),
  unique (user_id, media_id, season_number, episode_number)
);

-- =====================================================================
--  ratings  (1..10 at any scope)
-- =====================================================================
create table if not exists ratings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  media_id       uuid not null references media_items(id) on delete cascade,
  season_number  integer,
  episode_number integer,
  score          integer not null check (score between 1 and 10),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, media_id, season_number, episode_number)
);

-- =====================================================================
--  reviews
-- =====================================================================
create table if not exists reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  media_id       uuid not null references media_items(id) on delete cascade,
  season_number  integer,
  episode_number integer,
  score          integer check (score between 1 and 10),
  body           text not null,
  spoiler_scope  spoiler_scope not null default 'none',
  like_count     integer default 0,
  created_at     timestamptz default now()
);

-- =====================================================================
--  comments  (episode discussion)
-- =====================================================================
create table if not exists comments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  media_id       uuid not null references media_items(id) on delete cascade,
  season_number  integer,
  episode_number integer,
  parent_id      uuid references comments(id) on delete cascade,
  body           text not null,
  spoiler_scope  spoiler_scope not null default 'episode',
  like_count     integer default 0,
  created_at     timestamptz default now()
);

-- =====================================================================
--  follows  (users follow users)
-- =====================================================================
create table if not exists follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

-- =====================================================================
--  reactions  (likes on posts/comments/reviews)
-- =====================================================================
create table if not exists reactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  target_type  text not null check (target_type in ('comment','review')),
  target_id    uuid not null,
  emoji        text default '❤️',
  created_at   timestamptz default now(),
  unique (user_id, target_type, target_id, emoji)
);

-- =====================================================================
--  notifications
-- =====================================================================
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  actor_id     uuid references auth.users(id) on delete cascade,
  type         text not null,
  message      text not null,
  link         text,
  is_read      boolean default false,
  created_at   timestamptz default now()
);

-- =====================================================================
--  reports  (unmarked spoilers / moderation)
-- =====================================================================
create table if not exists reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references auth.users(id) on delete cascade,
  target_type  text not null check (target_type in ('comment','review')),
  target_id    uuid not null,
  reason       text not null,
  status       text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at   timestamptz default now()
);

-- Indexes --------------------------------------------------------------
create index if not exists idx_comments_scope on comments (media_id, season_number, episode_number);
create index if not exists idx_reviews_media on reviews (media_id);
create index if not exists idx_watch_user on watch_status (user_id);
create index if not exists idx_ratings_user on ratings (user_id);
create index if not exists idx_notifications_user on notifications (user_id, is_read);

-- =====================================================================
--  Auto-create a profile row when a new auth user signs up.
-- =====================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'user') || '_' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table profiles       enable row level security;
alter table media_items    enable row level security;
alter table seasons        enable row level security;
alter table episodes       enable row level security;
alter table watch_status   enable row level security;
alter table episode_watches enable row level security;
alter table ratings        enable row level security;
alter table reviews        enable row level security;
alter table comments       enable row level security;
alter table follows        enable row level security;
alter table reactions      enable row level security;
alter table notifications  enable row level security;
alter table reports        enable row level security;

-- Public read on catalog + social content ------------------------------
create policy "public read profiles"     on profiles      for select using (true);
create policy "public read media"         on media_items   for select using (true);
create policy "public read seasons"       on seasons       for select using (true);
create policy "public read episodes"      on episodes      for select using (true);
create policy "public read reviews"       on reviews       for select using (true);
create policy "public read comments"      on comments      for select using (true);
create policy "public read follows"       on follows       for select using (true);
create policy "public read reactions"     on reactions     for select using (true);

-- Any signed-in user may add catalog rows (upsert from TMDb) ------------
create policy "auth insert media"    on media_items   for insert to authenticated with check (true);
create policy "auth insert seasons"  on seasons       for insert to authenticated with check (true);
create policy "auth insert episodes" on episodes      for insert to authenticated with check (true);

-- Owner writes ---------------------------------------------------------
create policy "own profile update" on profiles for update using (auth.uid() = id);

create policy "own watch" on watch_status for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own episode watches" on episode_watches for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own ratings" on ratings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "select own watch" on watch_status for select using (auth.uid() = user_id);
create policy "select own episode watches" on episode_watches for select using (auth.uid() = user_id);
create policy "select own ratings" on ratings for select using (auth.uid() = user_id);

create policy "write own reviews" on reviews for insert with check (auth.uid() = user_id);
create policy "update own reviews" on reviews for update using (auth.uid() = user_id);
create policy "delete own reviews" on reviews for delete using (auth.uid() = user_id);

create policy "write own comments" on comments for insert with check (auth.uid() = user_id);
create policy "update own comments" on comments for update using (auth.uid() = user_id);
create policy "delete own comments" on comments for delete using (auth.uid() = user_id);

create policy "own follows" on follows for all
  using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "own reactions" on reactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own notifications read" on notifications for select using (auth.uid() = user_id);
create policy "own notifications update" on notifications for update using (auth.uid() = user_id);

create policy "own reports insert" on reports for insert with check (auth.uid() = reporter_id);
create policy "admin reports read" on reports for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "admin reports update" on reports for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- Admin moderation: admins may edit/remove any comment or review.
create policy "admin delete comments" on comments for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "admin update comments" on comments for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "admin delete reviews" on reviews for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "admin update reviews" on reviews for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- =====================================================================
--  Data API grants
--  Expose the public tables to the PostgREST roles used by supabase-js.
--  Safe because Row Level Security (enabled above) still gates every row;
--  these grants only allow the API roles to *attempt* access, which RLS
--  then filters. Needed when "Automatically expose new tables" is off.
-- =====================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Keep future tables/sequences exposed too.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
