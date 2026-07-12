-- =====================================================================
--  Watchruum — Activity presence toggle
--  Run in the Supabase SQL editor.
--
--  "Friends can see which room you're in" is powered by Supabase Realtime
--  *presence* (ephemeral — no table). The only persistent piece is this
--  per-user privacy switch: when it's off, the client never broadcasts,
--  so the user is invisible at the source (not just filtered in the UI).
--
--  Default TRUE — activity sharing is on unless the user opts out.
-- =====================================================================

alter table public.profiles
  add column if not exists show_activity boolean not null default true;

-- No new RLS policy needed: a user updates their own row under the
-- existing "profiles self update" policy, exactly like `is_private`.
