-- Prevent users from granting themselves admin/role via self-update.
-- is_admin / role can only be changed by the sync_secretary_admin trigger
-- or the admin-operations Edge Function (both bypass RLS via SECURITY DEFINER / service role).
drop policy if exists "Users can update their own profile" on profiles;

create policy "Users can update their own basic profile"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select is_admin from profiles where id = auth.uid())
    and role = (select role from profiles where id = auth.uid())
  );
