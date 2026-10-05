-- P0 RLS tightening: replace permissive "any authenticated ALL" policies with
-- least-privilege policies matching intended UX.
--
-- READ-ONLY discovery was against live project lncewemrcsfqfzjgrcdu (pg_policies).
-- DO NOT apply until reviewed. Triggers preserved unchanged:
--   bookings_status_check
--   cabins_booking_authority_guard
--   maintenance_done_writes_cabin_improvement_trigger
--   sync_secretary_admin (officers)
--
-- Admin check mirrors existing migrations (profiles.is_admin OR JWT super_admin).
-- Secretary check mirrors boat_trips / cabins_booking_authority_guard.

-- ---------------------------------------------------------------------------
-- Helper expressions (inlined; no new functions — avoids widening attack surface)
-- is_admin:
--   exists (select 1 from profiles where id = auth.uid() and is_admin = true)
--   or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
-- is_secretary:
--   exists (select 1 from officers where title = 'Secretary' and profile_id = auth.uid())
-- ---------------------------------------------------------------------------

-- =============================================================================
-- 1. bookings
-- Was: SELECT auth + ALL auth (any member full write)
-- Intended:
--   SELECT authenticated (shared calendar)
--   INSERT own (user_id = auth.uid())
--   UPDATE own rows (status changes still gated by bookings_status_check trigger)
--   UPDATE by cabin booking_authority or admin (status decisions)
--   DELETE own or admin
-- =============================================================================

drop policy if exists "Bookings are readable by all authenticated users" on bookings;
drop policy if exists "Bookings are writable by all authenticated users" on bookings;

create policy "Bookings readable by authenticated"
  on bookings for select
  using (auth.role() = 'authenticated');

create policy "Members can insert own bookings"
  on bookings for insert
  with check (auth.uid() = user_id);

create policy "Members can update own bookings"
  on bookings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Booking authority or admin can update bookings"
  on bookings for update
  using (
    exists (
      select 1 from cabins c
      where c.id = bookings.cabin_id
        and c.booking_authority_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    exists (
      select 1 from cabins c
      where c.id = bookings.cabin_id
        and c.booking_authority_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Members can delete own bookings or admin"
  on bookings for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- 2. cabins
-- Was: SELECT auth + ALL auth
-- Intended: SELECT auth; writes admin; Secretary may UPDATE (booking_authority UI).
-- booking_authority_id changes remain enforced by cabins_booking_authority_guard.
-- =============================================================================

drop policy if exists "Cabins are readable by all authenticated users" on cabins;
drop policy if exists "Cabins are writable by all authenticated users" on cabins;

create policy "Cabins readable by authenticated"
  on cabins for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert cabins"
  on cabins for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Admins or Secretary can update cabins"
  on cabins for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or exists (
      select 1 from officers
      where title = 'Secretary' and profile_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or exists (
      select 1 from officers
      where title = 'Secretary' and profile_id = auth.uid()
    )
  );

create policy "Admins can delete cabins"
  on cabins for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- 3. docks
-- Was: SELECT auth + ALL auth
-- Intended: SELECT auth; writes admin only (no Secretary pattern in UI)
-- =============================================================================

drop policy if exists "Docks readable by all authenticated users" on docks;
drop policy if exists "Docks writable by all authenticated users" on docks;

create policy "Docks readable by authenticated"
  on docks for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert docks"
  on docks for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Admins can update docks"
  on docks for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Admins can delete docks"
  on docks for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- 4. maintenance_categories
-- Was: SELECT auth + ALL auth
-- No created_by column and no member write UI — admin writes only.
-- =============================================================================

drop policy if exists "Categories readable by all authenticated users" on maintenance_categories;
drop policy if exists "Categories writable by all authenticated users" on maintenance_categories;

create policy "Categories readable by authenticated"
  on maintenance_categories for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert categories"
  on maintenance_categories for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Admins can update categories"
  on maintenance_categories for update
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Admins can delete categories"
  on maintenance_categories for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- 5. maintenance_tasks
-- Was: SELECT auth + ALL auth
-- Intended: SELECT auth; INSERT own; UPDATE creator/assignee/admin;
--           DELETE creator or admin.
-- Note: UI currently allows any member to flip status. Creator/assignee/admin
-- is a reasonable tighten; expand USING to auth.role()='authenticated' if full
-- club collaboration on status is required after review.
-- =============================================================================

drop policy if exists "Tasks readable by all authenticated users" on maintenance_tasks;
drop policy if exists "Tasks writable by all authenticated users" on maintenance_tasks;

create policy "Tasks readable by authenticated"
  on maintenance_tasks for select
  using (auth.role() = 'authenticated');

create policy "Members can insert own tasks"
  on maintenance_tasks for insert
  with check (auth.uid() = created_by);

create policy "Creator assignee or admin can update tasks"
  on maintenance_tasks for update
  using (
    auth.uid() = created_by
    or auth.uid() = assigned_to
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    auth.uid() = created_by
    or auth.uid() = assigned_to
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Creator or admin can delete tasks"
  on maintenance_tasks for delete
  using (
    auth.uid() = created_by
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- 6. maintenance_comments
-- Was: SELECT auth + ALL auth
-- Intended: SELECT auth; INSERT own; UPDATE/DELETE own or admin
-- =============================================================================

drop policy if exists "Comments readable by all authenticated users" on maintenance_comments;
drop policy if exists "Comments writable by all authenticated users" on maintenance_comments;

create policy "Comments readable by authenticated"
  on maintenance_comments for select
  using (auth.role() = 'authenticated');

create policy "Members can insert own comments"
  on maintenance_comments for insert
  with check (auth.uid() = user_id);

create policy "Author or admin can update comments"
  on maintenance_comments for update
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

create policy "Author or admin can delete comments"
  on maintenance_comments for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- 7. photo_albums
-- Was: SELECT everyone; INSERT auth; DELETE any auth
-- Intended: keep SELECT + INSERT; DELETE only creator or admin
-- =============================================================================

drop policy if exists "Authenticated users can delete albums" on photo_albums;

create policy "Creator or admin can delete albums"
  on photo_albums for delete
  using (
    auth.uid() = created_by
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- ---------------------------------------------------------------------------
-- ROLLBACK NOTES (do not run automatically — restore prior permissive policies)
-- ---------------------------------------------------------------------------
-- bookings:
--   drop new policies; recreate
--     "Bookings are readable by all authenticated users" FOR SELECT USING (auth.role() = 'authenticated');
--     "Bookings are writable by all authenticated users" FOR ALL USING (auth.role() = 'authenticated');
-- cabins / docks / maintenance_*: same pattern (readable SELECT + writable ALL).
-- photo_albums:
--   drop "Creator or admin can delete albums";
--   recreate "Authenticated users can delete albums" FOR DELETE USING (auth.role() = 'authenticated');
