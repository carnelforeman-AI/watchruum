-- ============================================================
-- Watchruum · Avatar uploads (Supabase Storage)
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run (idempotent).
--
-- Creates a public "avatars" bucket. Anyone can read avatars; a signed-in
-- user can only write/replace files inside a folder named after their own
-- user id (e.g. avatars/<uid>/avatar_123.jpg), enforced by RLS.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read of avatar images.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- A user may upload only into their own <uid>/ folder.
drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
