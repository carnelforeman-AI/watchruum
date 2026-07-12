-- =====================================================================
--  Watchruum — User preferences (spoiler safety + notification toggles)
--  Run in the Supabase SQL editor.
--
--  Backs the Settings → Spoiler safety selector and the Notifications
--  toggles, which were previously local-only UI state. Also lets the
--  profile header show the real spoiler-safety level.
-- =====================================================================

alter table public.profiles
  add column if not exists spoiler_safety   text    not null default 'strict',
  add column if not exists notify_replies   boolean not null default true,
  add column if not exists notify_likes     boolean not null default true,
  add column if not exists notify_unlocks   boolean not null default true,
  add column if not exists notify_trending  boolean not null default false;

-- Constrain the spoiler-safety level to the known set.
alter table public.profiles drop constraint if exists profiles_spoiler_safety_chk;
alter table public.profiles
  add constraint profiles_spoiler_safety_chk
  check (spoiler_safety in ('strict', 'balanced', 'off'));

-- No new RLS policy needed — a user updates their own row under the
-- existing "profiles self update" policy, same as is_private / show_activity.
