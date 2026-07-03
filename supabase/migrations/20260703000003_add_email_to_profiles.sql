-- Add email column to profiles so admins can see and send password resets
alter table profiles add column if not exists email text;

-- Update existing profiles with emails from auth.users
update profiles
set email = au.email
from auth.users au
where profiles.id = au.id
and profiles.email is null;

-- Update the trigger to auto-populate email on new signups
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;
