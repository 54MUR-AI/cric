-- map_pins was created with SELECT/INSERT/DELETE policies but never an UPDATE
-- policy, so editing a pin or setting image_url was silently blocked by RLS
-- (0 rows affected, no error). Add an UPDATE policy matching the admin pattern
-- used for insert/delete (protected profiles.is_admin OR app_metadata super_admin).
drop policy if exists "Admins can update pins" on map_pins;
create policy "Admins can update pins"
  on map_pins for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
