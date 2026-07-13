-- =====================================================================
--  memberships — Stripe subscription state, kept OUT of the public
--  profiles table so billing identifiers and payment status are never
--  world-readable. One row per member (user_id PK).
--
--  Access model:
--    • read  — your own row only
--    • write — you may self-select the FREE plan (the wall); PAID tiers
--              are granted exclusively by the service-role webhook, which
--              bypasses RLS. So a member can never self-assign Plus/Founder.
--
--  Run in the Supabase SQL editor. Safe to re-run. This SUPERSEDES the
--  older "add membership columns to profiles" migration and plan-wall.sql
--  (both are folded in here) — you can ignore those two files now.
-- =====================================================================

-- If an earlier version put these on the world-readable profiles table,
-- move them off it.
alter table profiles drop column if exists stripe_customer_id;
alter table profiles drop column if exists stripe_subscription_id;
alter table profiles drop column if exists membership_tier;
alter table profiles drop column if exists membership_status;
alter table profiles drop column if exists membership_billing;
alter table profiles drop column if exists membership_since;
alter table profiles drop column if exists membership_updated_at;
alter table profiles drop column if exists plan_chosen_at;

create table if not exists memberships (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  membership_tier         text not null default 'free',   -- free | plus | founder
  membership_status       text,                            -- Stripe subscription status
  membership_billing      text,                            -- monthly | annual
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_chosen_at          timestamptz,                     -- passed the "choose a plan" wall
  membership_since        timestamptz,
  updated_at              timestamptz default now()
);

create index if not exists idx_memberships_customer     on memberships (stripe_customer_id);
create index if not exists idx_memberships_subscription on memberships (stripe_subscription_id);

alter table memberships enable row level security;

-- Read only your own membership.
drop policy if exists "memberships own read" on memberships;
create policy "memberships own read" on memberships
  for select using (auth.uid() = user_id);

-- You may create/adjust your OWN row only while on the FREE plan (choosing
-- Free at the wall, or storing a Stripe customer id before paying). Paid
-- tiers are set only by the service-role webhook, which bypasses RLS.
drop policy if exists "memberships own free insert" on memberships;
create policy "memberships own free insert" on memberships
  for insert with check (auth.uid() = user_id and membership_tier = 'free');

drop policy if exists "memberships own free update" on memberships;
create policy "memberships own free update" on memberships
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and membership_tier = 'free');
