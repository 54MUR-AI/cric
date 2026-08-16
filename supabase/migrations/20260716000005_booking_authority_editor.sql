-- Only the super admin or the current Secretary may change a cabin's
-- booking authority. Enforced server-side regardless of RLS/API access.

create or replace function cabins_booking_authority_guard()
returns trigger as $$
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

drop trigger if exists cabins_booking_authority_guard on cabins;
create trigger cabins_booking_authority_guard
  before update on cabins
  for each row execute function cabins_booking_authority_guard();
