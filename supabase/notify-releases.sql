-- =====================================================================
--  Watchruum — "New releases" notification preference
--  Run in the Supabase SQL editor.
--
--  Master on/off for release notifications. Per-title opt-in already
--  exists (the Watch Calendar "Notify Me" → title_alerts); this is the
--  global switch in Settings that gates whether those fire at all.
-- =====================================================================

alter table public.profiles
  add column if not exists notify_releases boolean not null default true;
