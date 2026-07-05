-- Sync super admin status with Secretary board position
-- When someone is assigned as Secretary, they become super admin
-- When they lose the Secretary position, super admin is revoked

create or replace function sync_secretary_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    if new.title = 'Secretary' then
      update profiles set is_admin = true, role = 'super_admin' where id = new.profile_id;
      update auth.users set raw_app_meta_data =
        raw_app_meta_data || '{"role":"super_admin"}'::jsonb
        where id = new.profile_id;
    end if;
  end if;

  if tg_op in ('DELETE', 'UPDATE') then
    if old.title = 'Secretary' then
      if not exists (select 1 from officers where title = 'Secretary' and profile_id != old.profile_id) then
        update profiles set is_admin = false, role = 'member' where id = old.profile_id;
        update auth.users set raw_app_meta_data =
          raw_app_meta_data || '{"role":"member"}'::jsonb
          where id = old.profile_id;
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_sync_secretary_admin
  after insert or update or delete on officers
  for each row execute function sync_secretary_admin();
