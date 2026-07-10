-- Direct messages sent from an admin to a member. They land in the member's
-- envelope inbox alongside the sample/official messages.

create table if not exists user_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null default 'Watchruum Team',
  subject text not null,
  body text not null,
  official boolean not null default true,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_messages_recipient_idx
  on user_messages (recipient_id, created_at desc);

alter table user_messages enable row level security;

-- The recipient can read, mark-read, and delete their own messages.
drop policy if exists "own messages read" on user_messages;
create policy "own messages read" on user_messages
  for select using (auth.uid() = recipient_id);

drop policy if exists "own messages update" on user_messages;
create policy "own messages update" on user_messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

drop policy if exists "own messages delete" on user_messages;
create policy "own messages delete" on user_messages
  for delete using (auth.uid() = recipient_id);

-- Only admins may send (insert) messages, to anyone.
drop policy if exists "admin send messages" on user_messages;
create policy "admin send messages" on user_messages
  for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- Admins can also read what they've sent (for a future "sent" view).
drop policy if exists "admin read messages" on user_messages;
create policy "admin read messages" on user_messages
  for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));
