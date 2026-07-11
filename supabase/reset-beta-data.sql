-- =====================================================================
--  admin_reset_beta_data() — clear beta testing activity for a fresh start
--
--  Deletes all user-generated ACTIVITY & CONTENT but KEEPS member accounts
--  and profiles (and all TMDb cache / app config). Use this to wipe test
--  data before real launch without forcing everyone to sign up again.
--
--  Cleared:  reactions, actor comments, room comments, reviews, ratings,
--            per-episode watch log, watch progress/watchlist, title alerts,
--            notifications, reports, follows.
--  Kept:     profiles/accounts, media_items/seasons/episodes (TMDb cache),
--            app_settings (incl. the Live Mode flag), admin messages/invites,
--            moderation records, avatars.
--
--  SECURITY DEFINER so it can delete across every member's rows (past RLS),
--  but it refuses to run unless the CALLER is an admin (is_admin()). Safe to
--  expose over RPC to the admin panel.
--
--  Requires is_admin() (moderation.sql). Run this in the Supabase SQL editor.
-- =====================================================================

create or replace function admin_reset_beta_data()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result jsonb := '{}'::jsonb;
  -- Child/dependent tables first so foreign keys never block a delete.
  tbls text[] := array[
    'reactions',
    'person_comments',
    'comments',
    'reviews',
    'ratings',
    'episode_watches',
    'watch_status',
    'title_alerts',
    'notifications',
    'reports',
    'follows'
  ];
  t text;
  n integer;
begin
  if not is_admin() then
    raise exception 'Not authorized: admin only';
  end if;

  foreach t in array tbls loop
    begin
      execute format('delete from %I', t);
      get diagnostics n = row_count;
      result := result || jsonb_build_object(t, n);
    exception
      -- A table from an un-run migration simply gets skipped (null), not fatal.
      when undefined_table then
        result := result || jsonb_build_object(t, null);
    end;
  end loop;

  return result;
end;
$$;

-- Only signed-in admins may call it (the body re-checks is_admin anyway).
revoke all on function admin_reset_beta_data() from public, anon;
grant execute on function admin_reset_beta_data() to authenticated;
