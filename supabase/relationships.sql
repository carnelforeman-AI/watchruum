-- ============================================================
-- Watchruum · PostgREST embed relationships
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run (idempotent).
--
-- reviews.user_id / comments.user_id / reports.reporter_id reference
-- auth.users, so PostgREST can't resolve `author:profiles(...)` embeds and the
-- whole query fails (PGRST200). Adding a second FK to public.profiles(id) — the
-- 1:1 mirror of auth.users — lets the embeds resolve. Every author already has
-- a profile row (created by the signup trigger), so the constraints validate.
-- ============================================================

do $$ begin
  alter table public.reviews
    add constraint reviews_user_id_profiles_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.comments
    add constraint comments_user_id_profiles_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.reports
    add constraint reports_reporter_id_profiles_fkey
    foreign key (reporter_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

-- Nudge PostgREST to reload its schema cache immediately.
notify pgrst, 'reload schema';
