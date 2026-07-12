-- =====================================================================
--  Watchruum — Let reporters withdraw a report + see their own reports
--  Run in the Supabase SQL editor. Safe to re-run.
--
--  The reports table already allows inserting your own report and lets
--  admins read/update. This adds two policies so a user can UNDO a report
--  (delete their own row) and read their own reports (to reflect state).
-- =====================================================================

drop policy if exists "own reports delete" on reports;
create policy "own reports delete" on reports
  for delete using (auth.uid() = reporter_id);

drop policy if exists "own reports read" on reports;
create policy "own reports read" on reports
  for select using (auth.uid() = reporter_id);
