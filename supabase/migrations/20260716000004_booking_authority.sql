-- Booking authority: a member assigned per cabin who has final say over
-- bookings. New bookings are 'requested' until the authority confirms them.

-- 1. Authority column on cabins
alter table cabins add column if not exists booking_authority_id uuid references profiles(id) on delete set null;

-- 2. Booking status. New bookings are 'requested'; existing bookings predate
-- the approval flow so treat them as confirmed.
alter table bookings add column if not exists status text not null default 'requested';
update bookings set status = 'confirmed' where status = 'requested';
alter table bookings add constraint bookings_status_check check (status in ('requested', 'confirmed', 'rejected'));

-- 3. Enforce the flow server-side: inserts must start as 'requested', and only
-- the cabin's booking authority, an admin, or the service role may change it.
create or replace function bookings_status_check()
returns trigger as $$
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

drop trigger if exists bookings_status_check on bookings;
create trigger bookings_status_check
  before insert or update on bookings
  for each row execute function bookings_status_check();

create index if not exists idx_bookings_status on bookings (cabin_id, status);
