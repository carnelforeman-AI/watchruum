-- ============================================================
-- Watchruum · Profile privacy
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run (idempotent).
--
-- Adds a per-user private flag. When true, other people see only a
-- minimal profile card (name + avatar); the owner still sees everything.
-- Enforcement is app-side — the profiles row stays publicly readable so
-- the user's basic identity can appear in chat and member lists.
-- ============================================================

alter table public.profiles add column if not exists is_private boolean not null default false;

-- The existing "own profile update" policy (auth.uid() = id) already lets a
-- user toggle their own is_private, so no new policy is required.
