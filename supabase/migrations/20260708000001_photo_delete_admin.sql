drop policy if exists "Users can delete their own photos" on photos;

create policy "Users can delete their own photos"
  on photos for delete
  using (auth.uid() = uploaded_by OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
