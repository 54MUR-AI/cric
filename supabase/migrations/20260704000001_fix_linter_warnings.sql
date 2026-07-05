-- Fix Supabase linter warnings
-- Run this in the Supabase SQL editor

-- 1. handle_new_user: switch to SECURITY INVOKER with search_path
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

-- Revoke EXECUTE from anon and authenticated — this function is trigger-only
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 2. sync_secretary_admin: switch to SECURITY INVOKER with search_path
create or replace function public.sync_secretary_admin()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    if new.title = 'Secretary' then
      update profiles set is_admin = true, role = 'super_admin' where id = new.profile_id;
      update auth.users set raw_app_meta_data =
        raw_app_meta_data || jsonb_build_object('role', 'super_admin')
        where id = new.profile_id;
    end if;
  end if;

  if tg_op in ('DELETE', 'UPDATE') then
    if old.title = 'Secretary' then
      if not exists (select 1 from officers where title = 'Secretary' and profile_id != old.profile_id) then
        update profiles set is_admin = false, role = 'member' where id = old.profile_id;
        update auth.users set raw_app_meta_data =
          raw_app_meta_data || jsonb_build_object('role', 'member')
          where id = old.profile_id;
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

-- Revoke EXECUTE from anon and authenticated — this function is trigger-only
revoke execute on function public.sync_secretary_admin() from anon, authenticated;

-- 3. Move btree_gist extension out of public schema into extensions schema
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

-- 4. Remove broad SELECT policy on storage.objects for photos bucket
drop policy if exists "Public read" on storage.objects;
