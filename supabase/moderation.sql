-- ============================================================
-- Watchruum · Moderation backend
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run (idempotent).
-- ============================================================

-- Admin check helper. SECURITY DEFINER avoids RLS recursion when a
-- policy on `profiles` needs to know if the caller is an admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---- Account status on profiles ----------------------------
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists status_reason text;
alter table public.profiles add column if not exists status_updated_at timestamptz;

-- Allow admins to update any profile (status, role, etc.)
drop policy if exists "admins update any profile" on public.profiles;
create policy "admins update any profile" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ---- Admin notes -------------------------------------------
create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_notes enable row level security;

drop policy if exists "admins read notes" on public.admin_notes;
create policy "admins read notes" on public.admin_notes
  for select using (public.is_admin());

drop policy if exists "admins write notes" on public.admin_notes;
create policy "admins write notes" on public.admin_notes
  for insert with check (public.is_admin());

-- ---- Warnings ----------------------------------------------
create table if not exists public.user_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  issued_by uuid references public.profiles(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.user_warnings enable row level security;

drop policy if exists "read warnings" on public.user_warnings;
create policy "read warnings" on public.user_warnings
  for select using (public.is_admin() or user_id = auth.uid());

drop policy if exists "admins issue warnings" on public.user_warnings;
create policy "admins issue warnings" on public.user_warnings
  for insert with check (public.is_admin());

-- ---- Data API grants ---------------------------------------
grant select, insert on public.admin_notes to authenticated;
grant select, insert on public.user_warnings to authenticated;

-- Done. status values used by the app:
--   active | muted | limited | suspended | banned
