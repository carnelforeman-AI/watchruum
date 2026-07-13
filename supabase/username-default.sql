-- =====================================================================
--  username-default — stop leaking the email handle into the default
--  username. Previously a signup for jane.doe@gmail.com defaulted to the
--  username "jane.doe_xxxx"; now it's a neutral "user_<8 hex>". Members
--  still pick their own username during onboarding.
--
--  Run in the Supabase SQL editor. Safe to re-run.
-- =====================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.raw_user_meta_data->>'display_name', 'Watchruum Fan')
  )
  on conflict (id) do nothing;
  return new;
end $$;
