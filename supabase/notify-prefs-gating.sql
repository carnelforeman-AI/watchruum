-- =====================================================================
--  Watchruum — Make notification preferences actually gate delivery
--  Run in the Supabase SQL editor. Safe to re-run (create or replace).
--
--  Previously create_notification always inserted the in-app row and the
--  Settings toggles only suppressed Web Push. This updates the function so
--  it checks the recipient's per-type preference and skips the in-app
--  notification too when that type is turned off. Runs as SECURITY DEFINER,
--  so it can read the recipient's prefs across the RLS boundary.
--
--  Types not listed (follow, invite, system/moderation) always notify.
-- =====================================================================

create or replace function create_notification(
  p_recipient uuid,
  p_type      text,
  p_message   text,
  p_link      text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_muted boolean := false;
begin
  select case p_type
    when 'message'  then coalesce(notify_messages,  true) = false
    when 'reply'    then coalesce(notify_replies,   true) = false
    when 'like'     then coalesce(notify_likes,     true) = false
    when 'reaction' then coalesce(notify_likes,     true) = false
    when 'release'  then coalesce(notify_releases,  true) = false
    when 'reminder' then coalesce(notify_reminders, true) = false
    when 'unlock'   then coalesce(notify_unlocks,   true) = false
    when 'trending' then coalesce(notify_trending,  true) = false
    else false
  end
    into v_muted
    from profiles
   where id = p_recipient;

  if coalesce(v_muted, false) then
    return; -- recipient turned this notification type off
  end if;

  insert into notifications (user_id, type, message, link)
  values (p_recipient, p_type, p_message, coalesce(p_link, '/notifications'));
end;
$$;
