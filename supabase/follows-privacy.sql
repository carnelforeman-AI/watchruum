-- =====================================================================
--  follows-privacy — hide a PRIVATE account's social graph.
--
--  Previously `follows` was world-readable (using(true)), so anyone could
--  enumerate who follows whom — including the followers/following of a
--  private account. Now a follow edge is readable by the public only when
--  NEITHER endpoint is a private account. A private account's edges are
--  visible only to:
--     • an admin,
--     • the two people in the edge themselves (their own follows).
--
--  Counts on the profile page are unaffected for public accounts; private
--  accounts already show a restricted card, so their hidden counts stay 0
--  to non-admins — which is the intended behavior.
--
--  Requires public.is_admin() (moderation.sql). Run in the Supabase SQL
--  editor. Safe to re-run.
-- =====================================================================

drop policy if exists "public read follows" on follows;
drop policy if exists "read non-private follows" on follows;

create policy "read non-private follows" on follows
  for select using (
    public.is_admin()
    or auth.uid() = follower_id
    or auth.uid() = following_id
    or (
      not exists (select 1 from profiles p where p.id = follows.follower_id  and p.is_private)
      and
      not exists (select 1 from profiles p where p.id = follows.following_id and p.is_private)
    )
  );
