-- Add role column to profiles
alter table profiles add column if not exists role text not null default 'member';

-- Super admin can bypass 7-day lock on meetings
create policy "Super admins can update any meeting"
  on meetings for update using (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  );

create policy "Super admins can delete any meeting"
  on meetings for delete using (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  );

-- Super admin can bypass 7-day lock on agenda items
create policy "Super admins can update any agenda item"
  on meeting_agenda_items for update using (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  );

create policy "Super admins can delete any agenda item"
  on meeting_agenda_items for delete using (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  );

-- Super admin can update any profile
create policy "Super admins can update any profile"
  on profiles for update using (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  );
