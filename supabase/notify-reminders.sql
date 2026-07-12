-- =====================================================================
--  Watchruum — "Upcoming watch reminders" notification preference
--  Run in the Supabase SQL editor.
--
--  Governs the "starting soon" reminders for scheduled watches. When a
--  user turns this off in Settings → Notifications, the reminder
--  dispatcher skips them entirely (in-app + push). Per-item mutes
--  (scheduled_watch_mutes) still apply on top of this global switch.
-- =====================================================================

alter table profiles
  add column if not exists notify_reminders boolean not null default true;
