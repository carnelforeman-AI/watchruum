-- =====================================================================
--  plan-wall — the "choose a plan" gate shown before app access
--
--  A member has "passed the wall" once plan_chosen_at is set. It's set when
--  they pick Free (self-update) or complete a paid checkout (webhook /
--  success page). The app layout redirects members with a null value to
--  /welcome once Live Mode is on.
--
--  Safe to run more than once. Run in the Supabase SQL editor.
-- =====================================================================

alter table profiles add column if not exists plan_chosen_at timestamptz;

-- Members set their own value when choosing Free via the existing
-- "own profile update" policy (auth.uid() = id) — no new policy needed.
