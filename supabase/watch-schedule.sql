-- =====================================================================
--  Watchruum — Scheduled watches (plan when to watch) + watch parties
--  Run in the Supabase SQL editor.
--
--  Distinct from the release calendar (`title_alerts`, which tracks when
--  a title comes out). This is a user's *own plan* to watch something at
--  a chosen time — solo by default, or a "watch party" when friends are
--  invited. Titles may be upcoming and not in media_items yet, so we key
--  by tmdb_id + media_type and denormalize title/poster.
-- =====================================================================

create table if not exists scheduled_watches (
  id             uuid primary key default gen_random_uuid(),
  host_id        uuid not null references profiles(id) on delete cascade,
  tmdb_id        integer not null,
  media_type     media_type not null,
  title          text not null,
  poster_url     text,
  season_number  integer,
  episode_number integer,
  scheduled_at   timestamptz not null,
  note           text,
  is_party       boolean not null default false, -- friends invited?
  reminded_at    timestamptz,                     -- "starting soon" reminder sent
  created_at     timestamptz not null default now()
);
create index if not exists scheduled_watches_host_idx on scheduled_watches (host_id, scheduled_at);
create index if not exists scheduled_watches_due_idx  on scheduled_watches (scheduled_at) where reminded_at is null;

create table if not exists scheduled_watch_invites (
  schedule_id uuid not null references scheduled_watches(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  status      text not null default 'invited',  -- invited | going | maybe | declined
  created_at  timestamptz not null default now(),
  primary key (schedule_id, user_id),
  constraint swi_status_chk check (status in ('invited', 'going', 'maybe', 'declined'))
);
create index if not exists swi_user_idx on scheduled_watch_invites (user_id, status);

-- Web Push device subscriptions (for real phone/browser push). Dormant
-- until VAPID keys + a service worker are configured; the schema is ready.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table scheduled_watches        enable row level security;
alter table scheduled_watch_invites  enable row level security;
alter table push_subscriptions       enable row level security;

-- Scheduled watches: the host, or anyone invited, can read; only the host writes.
drop policy if exists "sw select" on scheduled_watches;
create policy "sw select" on scheduled_watches for select using (
  auth.uid() = host_id
  or exists (select 1 from scheduled_watch_invites i where i.schedule_id = id and i.user_id = auth.uid())
);
drop policy if exists "sw insert" on scheduled_watches;
create policy "sw insert" on scheduled_watches for insert with check (auth.uid() = host_id);
drop policy if exists "sw update" on scheduled_watches;
create policy "sw update" on scheduled_watches for update using (auth.uid() = host_id) with check (auth.uid() = host_id);
drop policy if exists "sw delete" on scheduled_watches;
create policy "sw delete" on scheduled_watches for delete using (auth.uid() = host_id);

-- Invites: the invitee or the host can read; the host adds; the invitee sets
-- their own RSVP; host or invitee can remove.
drop policy if exists "swi select" on scheduled_watch_invites;
create policy "swi select" on scheduled_watch_invites for select using (
  auth.uid() = user_id
  or exists (select 1 from scheduled_watches s where s.id = schedule_id and s.host_id = auth.uid())
);
drop policy if exists "swi insert" on scheduled_watch_invites;
create policy "swi insert" on scheduled_watch_invites for insert with check (
  exists (select 1 from scheduled_watches s where s.id = schedule_id and s.host_id = auth.uid())
);
drop policy if exists "swi update own" on scheduled_watch_invites;
create policy "swi update own" on scheduled_watch_invites for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "swi delete" on scheduled_watch_invites;
create policy "swi delete" on scheduled_watch_invites for delete using (
  auth.uid() = user_id
  or exists (select 1 from scheduled_watches s where s.id = schedule_id and s.host_id = auth.uid())
);

-- Push subscriptions: users manage only their own.
drop policy if exists "push own" on push_subscriptions;
create policy "push own" on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
