-- Adds a Moderator role. Moderators sit between members and admins: they can
-- moderate rooms (hide comments, mark spoilers, warn/mute users, pin
-- announcements, slow mode, lock rooms) but cannot ban site-wide, delete
-- accounts, change roles, or access private account data.
--
-- Admins already have UPDATE rights on profiles (used by role/status actions),
-- so no new policy is needed — just the column.

alter table profiles add column if not exists is_moderator boolean not null default false;
