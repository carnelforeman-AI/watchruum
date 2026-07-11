-- =====================================================================
--  Release-alert engine
--
--  Adds `notified_at` to title_alerts so the daily dispatch job only
--  notifies each subscriber once per title release. The job (a Vercel
--  Cron hitting /api/cron/release-alerts) reads title_alerts releasing
--  today and writes a real in-app notification for each subscriber.
--
--  Depends on watch_calendar.sql (title_alerts) + schema.sql (notifications).
--  Run in the Supabase SQL editor.
-- =====================================================================

alter table title_alerts add column if not exists notified_at timestamptz;

-- Fast lookup of "what releases today that hasn't been sent."
create index if not exists idx_title_alerts_due
  on title_alerts (release_date)
  where notified_at is null;
