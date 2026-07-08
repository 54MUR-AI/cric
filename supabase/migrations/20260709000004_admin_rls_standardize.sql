-- Standardize admin authorization: allow either the (now protected) profiles.is_admin
-- flag OR the JWT app_metadata.role claim. profiles.is_admin can no longer be
-- self-set (see 20260709000001), so both paths are safe.
drop policy if exists "Admins can insert pins" on map_pins;
create policy "Admins can insert pins"
  on map_pins for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

drop policy if exists "Admins can delete pins" on map_pins;
create policy "Admins can delete pins"
  on map_pins for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

drop policy if exists "Officers writable by super admin" on officers;
create policy "Officers writable by super admin"
  on officers for all
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
