-- Meeting minutes, agenda vote notes, annual improvement-log columns, and
-- project estimates.
--
-- Not applied to the live database. Apply with the usual migration process
-- after review.
--
-- RLS: signed-in members can read. Writes are limited to admins and officers.
-- The admin half is the existing check from 20261005000001_rls_p0_tighten.sql
-- (profiles.is_admin OR JWT app_metadata.role = super_admin). Officers are
-- board rows in public.officers. None of these tables are service-role-only
-- (unlike reset_notice_sends).

-- =============================================================================
-- 1. meeting_minutes
-- One row per received or drafted set of minutes for a meeting.
-- =============================================================================

create table if not exists meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'final')),
  summary text,
  body text,
  source_url text,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_minutes_final_has_text check (
    status <> 'final' or coalesce(summary, body) is not null
  )
);

create index if not exists meeting_minutes_meeting_id_idx
  on meeting_minutes (meeting_id);

alter table meeting_minutes enable row level security;

create policy "Minutes readable by authenticated"
  on meeting_minutes for select
  using (auth.role() = 'authenticated');

create policy "Admins and officers can manage minutes"
  on meeting_minutes for all
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or exists (select 1 from officers where profile_id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or exists (select 1 from officers where profile_id = auth.uid())
  );

-- =============================================================================
-- 2. meeting_agenda_items
-- Table already exists (20260703000001) with outcome vote_outcome
-- ('passed', 'failed', 'tabled'). Add the missing vote notes column only.
-- Existing read/write policies are left unchanged.
-- =============================================================================

alter table meeting_agenda_items
  add column if not exists vote_notes text;

-- =============================================================================
-- 3. cabin_improvements (Annual Improvements Log)
-- cabin_improvements already exists, keyed by cabin_id (the building).
-- Extend it instead of creating cabin_improvements_log.
-- year, description, and created_at already exist. source_task_id already
-- exists (20260716000006). Add cost, who did the work, and updated_at.
-- Member-read policy from 20260716000001 stays. Widen writes from admin-only
-- to the same admin-or-officer check used by the new tables.
-- =============================================================================

alter table cabin_improvements
  add column if not exists cost numeric(12, 2),
  add column if not exists done_by text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cabin_improvements_cost_nonnegative'
  ) then
    alter table cabin_improvements
      add constraint cabin_improvements_cost_nonnegative
      check (cost is null or cost >= 0);
  end if;
end $$;

create index if not exists cabin_improvements_cabin_year_idx
  on cabin_improvements (cabin_id, year desc);

drop policy if exists "Admins can manage improvements" on cabin_improvements;
create policy "Admins and officers can manage improvements"
  on cabin_improvements for all
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or exists (select 1 from officers where profile_id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or exists (select 1 from officers where profile_id = auth.uid())
  );

-- =============================================================================
-- 4. project_estimates
-- A vendor estimate for a project. line_items is a jsonb array of objects
-- like {"description": "...", "amount": 1200, "category": "materials"}.
-- source is where it came from, for example an email subject or message id.
-- materials_amount, labor_amount, and delivery_amount are the rolled-up
-- figures; total is the quoted total and is not generated from the lines.
-- =============================================================================

create table if not exists project_estimates (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  vendor text,
  line_items jsonb not null default '[]'::jsonb,
  materials_amount numeric(12, 2),
  labor_amount numeric(12, 2),
  delivery_amount numeric(12, 2),
  total numeric(12, 2),
  status text not null default 'draft' check (status in ('draft', 'received', 'accepted', 'declined')),
  notes text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_estimates_line_items_array check (jsonb_typeof(line_items) = 'array'),
  constraint project_estimates_amounts_nonnegative check (
    (materials_amount is null or materials_amount >= 0)
    and (labor_amount is null or labor_amount >= 0)
    and (delivery_amount is null or delivery_amount >= 0)
    and (total is null or total >= 0)
  )
);

create index if not exists project_estimates_status_idx
  on project_estimates (status);

alter table project_estimates enable row level security;

create policy "Estimates readable by authenticated"
  on project_estimates for select
  using (auth.role() = 'authenticated');

create policy "Admins and officers can manage estimates"
  on project_estimates for all
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or exists (select 1 from officers where profile_id = auth.uid())
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    or exists (select 1 from officers where profile_id = auth.uid())
  );
