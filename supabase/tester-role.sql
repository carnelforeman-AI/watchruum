-- =====================================================================
--  Watchruum — "Beta Tester" account flag
--  Run in the Supabase SQL editor. Safe to re-run.
--
--  A tester flag (alongside is_admin / is_moderator) that gates early-access
--  features. Features wrapped in <BetaGate> ship to production but render only
--  for testers (and admins) — so you can sandbox new work while regular users
--  keep seeing the stable app. Grant it from Admin → Users, or set it here:
--    update profiles set is_tester = true where username = 'someuser';
-- =====================================================================

alter table profiles
  add column if not exists is_tester boolean not null default false;
