-- =====================================================================
--  app_settings — global, admin-controlled app configuration
--  Single-row table (id = 1). Powers the "Go Live" switch: when
--  live_mode = true, the app shows REAL database counts everywhere
--  (each real action = +1, starting from 0) instead of the seeded
--  demo numbers used before launch.
--
--  Requires is_admin() (from moderation.sql) to already exist.
--  Run this in the Supabase SQL editor.
-- =====================================================================

create table if not exists app_settings (
  id          smallint primary key default 1,
  live_mode   boolean not null default false,
  updated_at  timestamptz default now(),
  updated_by  uuid references auth.users(id) on delete set null,
  constraint app_settings_singleton check (id = 1)
);

-- Seed the single row (stays demo/off until an admin flips it).
insert into app_settings (id, live_mode) values (1, false)
  on conflict (id) do nothing;

alter table app_settings enable row level security;

-- Anyone (even signed-out) can read the flag — every page needs it.
drop policy if exists "app_settings read" on app_settings;
create policy "app_settings read" on app_settings
  for select using (true);

-- Only admins can change it.
drop policy if exists "app_settings admin update" on app_settings;
create policy "app_settings admin update" on app_settings
  for update using (is_admin()) with check (is_admin());

drop policy if exists "app_settings admin insert" on app_settings;
create policy "app_settings admin insert" on app_settings
  for insert with check (is_admin());
