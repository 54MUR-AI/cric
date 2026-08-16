-- Clear database linter warnings:
-- 0011 function_search_path_mutable: pin search_path on the two trigger
--      functions that reference public tables.
-- 0028/0029 anon/authenticated can execute SECURITY DEFINER function: the
--      maintenance trigger function only ever runs via its trigger, so it does
--      not need to be directly callable by client roles over the RPC endpoint.

-- 1. bookings_status_check: pin search_path to public.
create or replace function bookings_status_check()
returns trigger
set search_path = public
as $$
declare
  v_authority uuid;
  v_admin boolean;
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'requested' then
      raise exception 'Bookings must start as requested';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if auth.uid() is not null then
      select booking_authority_id into v_authority from cabins where id = new.cabin_id;
      select is_admin into v_admin from profiles where id = auth.uid();
      if auth.uid() <> v_authority and coalesce(v_admin, false) = false then
        raise exception 'Only the booking authority can change booking status';
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

-- 2. cabins_booking_authority_guard: pin search_path to public.
create or replace function cabins_booking_authority_guard()
returns trigger
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_is_secretary boolean;
begin
  if new.booking_authority_id is distinct from old.booking_authority_id then
    -- Service role (auth.uid() is null) is trusted and bypasses the check.
    if auth.uid() is not null then
      select is_admin into v_is_admin from profiles where id = auth.uid();
      select exists(
        select 1 from officers where title = 'Secretary' and profile_id = auth.uid()
      ) into v_is_secretary;
      if not coalesce(v_is_admin, false) and not coalesce(v_is_secretary, false) then
        raise exception 'Only the super admin or secretary can set the booking authority';
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- 3. Stop exposing the maintenance trigger function as a client-callable RPC.
revoke execute on function public.maintenance_done_writes_cabin_improvement() from public, anon, authenticated;
grant execute on function public.maintenance_done_writes_cabin_improvement() to service_role, postgres;
