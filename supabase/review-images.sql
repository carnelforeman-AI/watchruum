-- ============================================================
-- Watchruum · Review screenshots (Supabase Storage + column)
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor),
-- BEFORE deploying the review-screenshots code. Safe to re-run (idempotent).
--
-- Adds an image_urls column to reviews and a public "review-images" bucket.
-- Anyone can read; a signed-in user can only write inside a folder named
-- after their own user id (e.g. review-images/<uid>/1699_ab12.jpg).
-- ============================================================

-- 1) Column to hold attached screenshot URLs.
alter table reviews
  add column if not exists image_urls text[] not null default '{}';

-- 2) Public bucket for the screenshots.
insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

-- Public read of review images.
drop policy if exists "review-images public read" on storage.objects;
create policy "review-images public read" on storage.objects
  for select using (bucket_id = 'review-images');

-- A user may upload only into their own <uid>/ folder.
drop policy if exists "review-images insert own" on storage.objects;
create policy "review-images insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "review-images update own" on storage.objects;
create policy "review-images update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "review-images delete own" on storage.objects;
create policy "review-images delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);
