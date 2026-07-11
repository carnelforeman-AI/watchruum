-- =====================================================================
--  Watchruum — Direct Messages (peer-to-peer DMs with read receipts)
--  Run in the Supabase SQL editor.
--
--  This backs the Message window on the Friends panel / directory:
--  real persistence, Realtime delivery, and read receipts that fire when
--  the *recipient* actually opens the conversation.
--
--  NOTE: this is distinct from `user_messages.sql`, which is the
--  admin -> member envelope inbox. This table is symmetric 1:1 chat.
-- =====================================================================

create table if not exists direct_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body         text,
  image_url    text,          -- downscaled data URL (or Storage URL later)
  sticker      text,          -- a single emoji "sticker"
  created_at   timestamptz not null default now(),
  read_at      timestamptz,   -- set when the recipient opens the thread
  -- A message must carry *something*.
  constraint dm_has_content check (
    (body is not null and length(btrim(body)) > 0)
    or image_url is not null
    or sticker is not null
  ),
  -- No messaging yourself.
  constraint dm_not_self check (sender_id <> recipient_id)
);

-- Fast history lookups in both directions, plus an unread probe.
create index if not exists dm_pair_idx
  on direct_messages (sender_id, recipient_id, created_at);
create index if not exists dm_pair_rev_idx
  on direct_messages (recipient_id, sender_id, created_at);
create index if not exists dm_unread_idx
  on direct_messages (recipient_id) where read_at is null;

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table direct_messages enable row level security;

-- Either participant can read the thread.
drop policy if exists "dm participants read" on direct_messages;
create policy "dm participants read" on direct_messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- You may only send as yourself.
drop policy if exists "dm sender insert" on direct_messages;
create policy "dm sender insert" on direct_messages
  for insert
  with check (auth.uid() = sender_id);

-- Deliberately NO update/delete policy: marking-read goes through the
-- SECURITY DEFINER function below so a recipient can't tamper with the
-- body/sender of a received message. (No policy => no direct UPDATE/DELETE.)

-- =====================================================================
--  mark_conversation_read(other) — the recipient marks every unread
--  message from `other` as read. Runs as definer so it can UPDATE
--  read_at without a table-level UPDATE policy. The resulting UPDATE is
--  what the sender's Realtime subscription hears to flip the checkmarks.
-- =====================================================================
create or replace function mark_conversation_read(other uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update direct_messages
     set read_at = now()
   where recipient_id = auth.uid()
     and sender_id = other
     and read_at is null;
$$;

revoke all on function mark_conversation_read(uuid) from public;
grant execute on function mark_conversation_read(uuid) to authenticated;

-- =====================================================================
--  Realtime — the client subscribes to INSERT (incoming) and UPDATE
--  (read receipts). Add the table to the realtime publication and use
--  full replica identity so UPDATE payloads carry the row.
-- =====================================================================
alter table direct_messages replica identity full;

do $$ begin
  alter publication supabase_realtime add table direct_messages;
exception
  when duplicate_object then null;  -- already published
  when undefined_object then null;  -- publication not present in this project
end $$;
