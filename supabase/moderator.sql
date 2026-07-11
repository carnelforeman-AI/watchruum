-- =====================================================================
--  Moderator dashboard support
--
--  mod_set_report_status(report_id, status) — lets a MODERATOR or ADMIN
--  update a report's status (resolve / dismiss / reviewing) from the
--  Moderator Dashboard. SECURITY DEFINER so it works past RLS for both
--  roles, but refuses unless the caller is a moderator or admin.
--
--  Requires profiles.is_moderator (moderator_role.sql). Run in the Supabase
--  SQL editor.
-- =====================================================================

create or replace function mod_set_report_status(report_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  ok boolean;
begin
  select coalesce(is_admin, false) or coalesce(is_moderator, false)
    into ok
    from profiles
    where id = auth.uid();

  if not coalesce(ok, false) then
    raise exception 'Not authorized: moderators or admins only';
  end if;

  if new_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid status: %', new_status;
  end if;

  update reports set status = new_status where id = report_id;
end;
$$;

revoke all on function mod_set_report_status(uuid, text) from public, anon;
grant execute on function mod_set_report_status(uuid, text) to authenticated;
