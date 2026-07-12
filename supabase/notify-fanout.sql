-- =====================================================================
--  Watchruum — Notification fan-out (in-app + Web Push)
--  Run in the Supabase SQL editor.
--
--  Single choke point so every social event (DM, reply, like, follow,
--  watch-party invite, …) creates a real in-app notification and — when
--  Web Push is configured — pushes it to the recipient's devices.
--
--  `create_notification` is SECURITY DEFINER so an authenticated user can
--  create a notification *for another user* (e.g. "you liked my review")
--  without a table INSERT policy that would let anyone spam anyone.
-- =====================================================================

-- Per-user "Direct messages" notification preference (joins the existing
-- notify_replies / notify_likes / notify_unlocks / notify_trending set).
alter table public.profiles
  add column if not exists notify_messages boolean not null default true;

create or replace function create_notification(
  p_recipient uuid,
  p_type      text,
  p_message   text,
  p_link      text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into notifications (user_id, type, message, link)
  values (p_recipient, p_type, p_message, coalesce(p_link, '/notifications'));
$$;

revoke all on function create_notification(uuid, text, text, text) from public;
grant execute on function create_notification(uuid, text, text, text) to authenticated;
