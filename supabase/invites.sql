-- Invite links: admins create them, invitees redeem them at /join/<token>.

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  name text,
  type text,
  audience text,
  subject text,
  message text,
  expires_at timestamptz,
  max_uses integer,
  uses_count integer not null default 0,
  allow_forward boolean not null default false,
  track boolean not null default true,
  require_verify boolean not null default false,
  send_now boolean not null default true,
  status text not null default 'active', -- active | revoked
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invites_token_idx on invites (token);

alter table invites enable row level security;

-- Only admins can manage invites from the dashboard.
drop policy if exists "admins manage invites" on invites;
create policy "admins manage invites" on invites
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- Public, read-only lookup of an invite by token (no direct table access for anon).
create or replace function invite_lookup(p_token text)
returns table (
  state text,
  invite_name text,
  subject text,
  message text,
  expires_at timestamptz,
  uses_count integer,
  max_uses integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r invites%rowtype;
begin
  select * into r from invites where token = p_token;
  if not found then
    state := 'not_found';
    return next;
    return;
  end if;

  if r.status = 'revoked' then
    state := 'revoked';
  elsif r.expires_at is not null and r.expires_at < now() then
    state := 'expired';
  elsif r.max_uses is not null and r.uses_count >= r.max_uses then
    state := 'used';
  else
    state := 'valid';
  end if;

  invite_name := r.name;
  subject := r.subject;
  message := r.message;
  expires_at := r.expires_at;
  uses_count := r.uses_count;
  max_uses := r.max_uses;
  return next;
end;
$$;

-- Redeem an invite: re-checks validity and increments the use counter atomically.
create or replace function invite_accept(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r invites%rowtype;
begin
  select * into r from invites where token = p_token for update;
  if not found then
    return 'not_found';
  end if;
  if r.status = 'revoked' then
    return 'revoked';
  end if;
  if r.expires_at is not null and r.expires_at < now() then
    return 'expired';
  end if;
  if r.max_uses is not null and r.uses_count >= r.max_uses then
    return 'used';
  end if;

  update invites set uses_count = uses_count + 1 where id = r.id;
  return 'accepted';
end;
$$;

grant execute on function invite_lookup(text) to anon, authenticated;
grant execute on function invite_accept(text) to anon, authenticated;
