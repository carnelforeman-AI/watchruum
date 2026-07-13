-- =====================================================================
--  The Lobby — an X-style social timeline for hanging out and talking
--  movies/shows (distinct from spoiler-safe watch rooms).
--
--  Tables: lobby_posts (+ threaded replies via reply_to), lobby_likes,
--  lobby_reposts, lobby_bookmarks. A security-invoker `lobby_feed` view
--  exposes each post with its counts and the viewer's own like/repost/
--  bookmark flags. Blocking is respected automatically because the view
--  reads lobby_posts under RLS (see block-filtering.sql).
--
--  Requires is_blocked_between() (blocks.sql). Run in the Supabase SQL
--  editor. Safe to re-run.
-- =====================================================================

create table if not exists lobby_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text,
  spoiler     boolean not null default false,
  media_id    text,          -- optional tagged title (catalog id)
  media_title text,
  media_type  text,          -- 'tv' | 'movie'
  image_url   text,          -- optional downscaled data URL
  reply_to    uuid references lobby_posts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint lobby_has_content check (
    (body is not null and length(btrim(body)) > 0) or image_url is not null
  )
);

create index if not exists lobby_posts_created_idx on lobby_posts (created_at desc) where reply_to is null;
create index if not exists lobby_posts_reply_idx   on lobby_posts (reply_to, created_at);
create index if not exists lobby_posts_user_idx     on lobby_posts (user_id, created_at desc);

create table if not exists lobby_likes (
  post_id uuid not null references lobby_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists lobby_reposts (
  post_id uuid not null references lobby_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists lobby_bookmarks (
  post_id uuid not null references lobby_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table lobby_posts     enable row level security;
alter table lobby_likes     enable row level security;
alter table lobby_reposts   enable row level security;
alter table lobby_bookmarks enable row level security;

-- Posts: public read (minus blocked authors), write/edit/delete your own.
drop policy if exists "lobby posts read" on lobby_posts;
create policy "lobby posts read" on lobby_posts
  for select using (not public.is_blocked_between(auth.uid(), user_id));
drop policy if exists "lobby posts insert own" on lobby_posts;
create policy "lobby posts insert own" on lobby_posts
  for insert with check (auth.uid() = user_id);
drop policy if exists "lobby posts update own" on lobby_posts;
create policy "lobby posts update own" on lobby_posts
  for update using (auth.uid() = user_id);
drop policy if exists "lobby posts delete own" on lobby_posts;
create policy "lobby posts delete own" on lobby_posts
  for delete using (auth.uid() = user_id);

-- Likes / reposts: counts are public; you manage only your own row.
drop policy if exists "lobby likes read" on lobby_likes;
create policy "lobby likes read" on lobby_likes for select using (true);
drop policy if exists "lobby likes own" on lobby_likes;
create policy "lobby likes own" on lobby_likes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lobby reposts read" on lobby_reposts;
create policy "lobby reposts read" on lobby_reposts for select using (true);
drop policy if exists "lobby reposts own" on lobby_reposts;
create policy "lobby reposts own" on lobby_reposts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bookmarks are private to the owner.
drop policy if exists "lobby bookmarks own" on lobby_bookmarks;
create policy "lobby bookmarks own" on lobby_bookmarks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Feed view: counts + the viewer's own flags. security_invoker so the
-- underlying RLS (incl. block filtering) applies to the caller.
create or replace view lobby_feed with (security_invoker = on) as
select
  p.id, p.user_id, p.body, p.spoiler, p.media_id, p.media_title, p.media_type,
  p.image_url, p.reply_to, p.created_at,
  pr.username, pr.display_name, pr.avatar_url, pr.is_tester,
  (select count(*) from lobby_likes   l where l.post_id = p.id) as like_count,
  (select count(*) from lobby_reposts r where r.post_id = p.id) as repost_count,
  (select count(*) from lobby_posts   c where c.reply_to = p.id) as reply_count,
  exists (select 1 from lobby_likes     l where l.post_id = p.id and l.user_id = auth.uid()) as liked,
  exists (select 1 from lobby_reposts   r where r.post_id = p.id and r.user_id = auth.uid()) as reposted,
  exists (select 1 from lobby_bookmarks b where b.post_id = p.id and b.user_id = auth.uid()) as bookmarked
from lobby_posts p
join profiles pr on pr.id = p.user_id;

-- Realtime for live feeds (optional; ignored if the publication isn't present).
do $$ begin
  alter publication supabase_realtime add table lobby_posts;
exception when duplicate_object then null; when undefined_object then null; end $$;
