-- =====================================================================
--  blocks — user-to-user blocking. Blocking is mutual-invisible for DMs:
--  if either party has blocked the other, neither can start a DM.
--
--  Run in the Supabase SQL editor. Safe to re-run. Requires the
--  direct_messages table (direct-messages.sql) to already exist.
-- =====================================================================

create table if not exists blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create index if not exists idx_blocks_blocked on blocks (blocked_id);

alter table blocks enable row level security;

-- You can only see and manage your own block list.
drop policy if exists "blocks own read" on blocks;
create policy "blocks own read" on blocks for select using (auth.uid() = blocker_id);
drop policy if exists "blocks own insert" on blocks;
create policy "blocks own insert" on blocks for insert with check (auth.uid() = blocker_id);
drop policy if exists "blocks own delete" on blocks;
create policy "blocks own delete" on blocks for delete using (auth.uid() = blocker_id);

-- Is there a block in EITHER direction between two users? SECURITY DEFINER so
-- a policy can check the other person's block list (RLS hides it otherwise).
create or replace function is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;
grant execute on function is_blocked_between(uuid, uuid) to authenticated;

-- Re-create the DM insert policy so a blocked pair can't message each other.
-- (DB-enforced — not just hidden in the UI.)
drop policy if exists "dm sender insert" on direct_messages;
create policy "dm sender insert" on direct_messages
  for insert
  with check (
    auth.uid() = sender_id
    and not is_blocked_between(sender_id, recipient_id)
  );
