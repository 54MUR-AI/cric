-- Add role column to profiles (member | super_admin)
alter table profiles add column if not exists role text not null default 'member';

-- Migrate existing is_admin = true users to super_admin role
update profiles set role = 'super_admin' where is_admin = true;

-- Update the trigger to set role from user metadata on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.app_metadata->>'role', 'member')
  );
  return new;
end;
$$ language plpgsql security definer;

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
