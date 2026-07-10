-- =====================================================================
--  Watchruum — Watch Calendar backend
--  "Notify Me" / "Follow" subscriptions for upcoming titles, plus an
--  anonymous "fans waiting" count. Run in the Supabase SQL editor.
--
--  Depends on schema.sql (media_type enum, profiles/auth.users).
--  Upcoming titles may not exist in media_items yet, so alerts are keyed
--  by tmdb_id + media_type and carry a denormalized title/poster/date.
-- =====================================================================

-- ---------------------------------------------------------------------
--  title_alerts — one row per (user, upcoming title) they're tracking.
--  `following = true`  → the lighter "Follow updates".
--  `alert_types`       → which events fire a notification ("Notify Me").
-- ---------------------------------------------------------------------
create table if not exists title_alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  tmdb_id      integer not null,
  media_type   media_type not null,
  title        text not null,
  poster_url   text,
  release_date date,
  -- event kinds: release, trailer, room, new_episode, new_season,
  -- date_changed, platform, reminder_1d, available
  alert_types  text[] not null default '{release,trailer,room}',
  following    boolean not null default true,
  created_at   timestamptz default now(),
  unique (user_id, tmdb_id, media_type)
);

create index if not exists idx_title_alerts_user  on title_alerts (user_id);
create index if not exists idx_title_alerts_title on title_alerts (tmdb_id, media_type);

alter table title_alerts enable row level security;

-- Owners manage only their own alerts.
create policy "own title alerts" on title_alerts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
--  Anonymous "fans waiting" counts.
--  SECURITY DEFINER so the aggregate can be read past RLS while never
--  exposing which users are interested — only totals come back.
-- ---------------------------------------------------------------------
create or replace function title_interest_counts()
returns table (tmdb_id integer, media_type media_type, fans bigint)
language sql security definer set search_path = public stable as $$
  select tmdb_id, media_type, count(*)::bigint as fans
  from title_alerts
  group by tmdb_id, media_type;
$$;

create or replace function title_interest_count(p_tmdb_id integer, p_media_type media_type)
returns bigint
language sql security definer set search_path = public stable as $$
  select count(*)::bigint from title_alerts
  where tmdb_id = p_tmdb_id and media_type = p_media_type;
$$;

grant execute on function title_interest_counts()                     to anon, authenticated;
grant execute on function title_interest_count(integer, media_type)   to anon, authenticated;

-- Data API grants (in case "expose new tables" / default privileges are off).
grant select, insert, update, delete on title_alerts to anon, authenticated;
