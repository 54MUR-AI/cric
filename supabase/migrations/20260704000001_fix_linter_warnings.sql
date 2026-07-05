-- Fix Supabase linter warnings
-- Run this in the Supabase SQL editor

-- 1. handle_new_user: set search_path to prevent search_path injection
-- Required by SECURITY DEFINER functions per Supabase security guidelines
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
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

-- 2. Move btree_gist extension out of public schema into extensions schema
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

-- 3. Remove broad SELECT policy on storage.objects for photos bucket
-- Public buckets don't need a SELECT policy for URL access, and the photo
-- gallery is driven by the photos table (not raw storage listing)
drop policy if exists "Public read" on storage.objects;
