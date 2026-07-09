-- ============================================================
-- Watchruum · Watch Room states
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run (idempotent).
--
-- Rooms are derived from TMDb titles, so there is no rooms table.
-- This table persists *admin overrides* for a derived room, keyed by
-- the stable room id the app generates (e.g. show_1399, mov_27205,
-- ep_1399_s1e4). Only the flags that differ from the default live here.
-- ============================================================

create table if not exists public.room_states (
  room_key text primary key,
  featured boolean not null default false,
  pinned boolean not null default false,
  locked boolean not null default false,
  archived boolean not null default false,
  hidden boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.room_states enable row level security;

-- Anyone signed in can read room states (so the app can reflect a locked or
-- featured room to normal users later); only admins can change them.
drop policy if exists "read room states" on public.room_states;
create policy "read room states" on public.room_states
  for select using (true);

drop policy if exists "admins insert room states" on public.room_states;
create policy "admins insert room states" on public.room_states
  for insert with check (public.is_admin());

drop policy if exists "admins update room states" on public.room_states;
create policy "admins update room states" on public.room_states
  for update using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.room_states to authenticated;

-- Done. This relies on public.is_admin() from moderation.sql — run that first.
