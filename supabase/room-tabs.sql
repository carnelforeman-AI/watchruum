-- =====================================================================
--  Watchruum — Room activity tabs (Discussion, Polls, Media)
--  Run in the Supabase SQL editor.
--
--  Separates a room's activity so it isn't one messy chat feed:
--    • Chat        → existing `comments` table (unchanged)
--    • Discussion  → room_threads + room_thread_replies (Reddit-style)
--    • Polls       → room_polls + room_poll_votes (one vote/user/poll)
--    • Media       → room_media (approved links, images, fan content)
--    • About       → derived from room data, no table
--
--  Every table is keyed by (media_id, season_number, episode_number) the
--  same way comments are — movies use null season/episode. `user_id`
--  references profiles(id) (the 1:1 mirror of auth.users) so PostgREST can
--  embed `author:profiles(...)` without the PGRST200 trap.
-- =====================================================================

-- ---------------------------------------------------------------- Discussion
create table if not exists room_threads (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  media_id       uuid not null references media_items(id) on delete cascade,
  season_number  integer,
  episode_number integer,
  title          text not null,
  body           text not null,
  spoiler_scope  spoiler_scope not null default 'episode',
  created_at     timestamptz not null default now()
);
create index if not exists room_threads_key_idx
  on room_threads (media_id, season_number, episode_number, created_at desc);

create table if not exists room_thread_replies (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references room_threads(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists room_thread_replies_thread_idx
  on room_thread_replies (thread_id, created_at);

-- ---------------------------------------------------------------- Polls
create table if not exists room_polls (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  media_id       uuid not null references media_items(id) on delete cascade,
  season_number  integer,
  episode_number integer,
  question       text not null,
  options        text[] not null,          -- 2..6 choices
  created_at     timestamptz not null default now(),
  constraint room_polls_options_len check (array_length(options, 1) between 2 and 6)
);
create index if not exists room_polls_key_idx
  on room_polls (media_id, season_number, episode_number, created_at desc);

create table if not exists room_poll_votes (
  poll_id      uuid not null references room_polls(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  option_index integer not null,
  created_at   timestamptz not null default now(),
  primary key (poll_id, user_id)           -- one vote per user per poll
);

-- ---------------------------------------------------------------- Media
create table if not exists room_media (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  media_id       uuid not null references media_items(id) on delete cascade,
  season_number  integer,
  episode_number integer,
  kind           text not null default 'link',  -- trailer | clip | image | meme | link
  url            text not null,                 -- external URL, or data URL for images
  caption        text,
  spoiler        boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists room_media_key_idx
  on room_media (media_id, season_number, episode_number, created_at desc);

-- =====================================================================
--  Row Level Security — signed-in users read everything in a room and
--  create their own rows. (Rooms are public within the app.)
-- =====================================================================
alter table room_threads        enable row level security;
alter table room_thread_replies enable row level security;
alter table room_polls          enable row level security;
alter table room_poll_votes     enable row level security;
alter table room_media          enable row level security;

-- Threads
drop policy if exists "threads read" on room_threads;
create policy "threads read" on room_threads for select using (true);
drop policy if exists "threads insert own" on room_threads;
create policy "threads insert own" on room_threads for insert with check (auth.uid() = user_id);
drop policy if exists "threads delete own" on room_threads;
create policy "threads delete own" on room_threads for delete using (auth.uid() = user_id);

-- Replies
drop policy if exists "replies read" on room_thread_replies;
create policy "replies read" on room_thread_replies for select using (true);
drop policy if exists "replies insert own" on room_thread_replies;
create policy "replies insert own" on room_thread_replies for insert with check (auth.uid() = user_id);
drop policy if exists "replies delete own" on room_thread_replies;
create policy "replies delete own" on room_thread_replies for delete using (auth.uid() = user_id);

-- Polls
drop policy if exists "polls read" on room_polls;
create policy "polls read" on room_polls for select using (true);
drop policy if exists "polls insert own" on room_polls;
create policy "polls insert own" on room_polls for insert with check (auth.uid() = user_id);
drop policy if exists "polls delete own" on room_polls;
create policy "polls delete own" on room_polls for delete using (auth.uid() = user_id);

-- Poll votes — read all (to tally), insert/update/delete only your own vote.
drop policy if exists "votes read" on room_poll_votes;
create policy "votes read" on room_poll_votes for select using (true);
drop policy if exists "votes insert own" on room_poll_votes;
create policy "votes insert own" on room_poll_votes for insert with check (auth.uid() = user_id);
drop policy if exists "votes update own" on room_poll_votes;
create policy "votes update own" on room_poll_votes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "votes delete own" on room_poll_votes;
create policy "votes delete own" on room_poll_votes for delete using (auth.uid() = user_id);

-- Media
drop policy if exists "media read" on room_media;
create policy "media read" on room_media for select using (true);
drop policy if exists "media insert own" on room_media;
create policy "media insert own" on room_media for insert with check (auth.uid() = user_id);
drop policy if exists "media delete own" on room_media;
create policy "media delete own" on room_media for delete using (auth.uid() = user_id);
