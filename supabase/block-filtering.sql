-- =====================================================================
--  block-filtering — hide blocked users' content everywhere at once.
--
--  Like X and Facebook, a block is comprehensive: if either party has
--  blocked the other, that person's posts disappear from your view. We do
--  this at the RLS layer so every surface (title pages, rooms, profiles,
--  threads) is covered by a single rule instead of per-query filters.
--
--  For signed-out/SSR reads auth.uid() is null, so is_blocked_between()
--  returns false and nothing is filtered — public content stays public.
--
--  Requires is_blocked_between() (blocks.sql). Run in the Supabase SQL
--  editor. Safe to re-run.
-- =====================================================================

-- reviews
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews
  for select using (not public.is_blocked_between(auth.uid(), user_id));

-- comments (room discussion feed)
drop policy if exists "public read comments" on comments;
create policy "public read comments" on comments
  for select using (not public.is_blocked_between(auth.uid(), user_id));

-- threaded replies on reviews
drop policy if exists "review comments read" on review_comments;
create policy "review comments read" on review_comments
  for select using (not public.is_blocked_between(auth.uid(), user_id));

-- room discussion threads + replies
drop policy if exists "threads read" on room_threads;
create policy "threads read" on room_threads
  for select using (not public.is_blocked_between(auth.uid(), user_id));

drop policy if exists "replies read" on room_thread_replies;
create policy "replies read" on room_thread_replies
  for select using (not public.is_blocked_between(auth.uid(), user_id));

-- comments on people (cast/crew pages)
drop policy if exists "public read person comments" on person_comments;
create policy "public read person comments" on person_comments
  for select using (not public.is_blocked_between(auth.uid(), user_id));
