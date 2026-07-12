-- =====================================================================
--  Watchruum — Per-item "Notify me" control for scheduled watches
--  Run in the Supabase SQL editor.
--
--  Watch reminders ("starting soon") are ON by default for the host and
--  every "going" invitee. This table records the exceptions: a row here
--  means "don't notify ME about THIS scheduled watch." The My Schedule
--  "Notify me" toggle adds/removes a row, and the reminder dispatcher
--  skips anyone who has muted a given watch.
-- =====================================================================

create table if not exists scheduled_watch_mutes (
  user_id     uuid not null references profiles(id) on delete cascade,
  schedule_id uuid not null references scheduled_watches(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, schedule_id)
);
create index if not exists swm_schedule_idx on scheduled_watch_mutes (schedule_id);

alter table scheduled_watch_mutes enable row level security;

-- Users manage only their own mutes.
drop policy if exists "swm own" on scheduled_watch_mutes;
create policy "swm own" on scheduled_watch_mutes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
