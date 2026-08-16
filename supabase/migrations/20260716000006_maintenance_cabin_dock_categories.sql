-- Tie maintenance categories to cabins/lean-tos and docks, and auto-record an
-- improvement in a cabin's history whenever a maintenance task for that cabin
-- is marked done.

-- 1. Docks (configurable reference table)
create table if not exists docks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table docks enable row level security;

create policy "Docks readable by all authenticated users"
  on docks for select using (auth.role() = 'authenticated');

create policy "Docks writable by all authenticated users"
  on docks for all using (auth.role() = 'authenticated');

-- Seed docks
insert into docks (name, sort_order)
select v.name, v.sort_order
from (values
  ('Loon Dock', 1),
  ('Main Dock', 2),
  ('Toad Dock', 3),
  ('Boathouse', 4)
) as v(name, sort_order)
where not exists (select 1 from docks d where d.name = v.name);

-- 2. Link categories to a cabin or a dock (at most one of the two)
alter table maintenance_categories add column if not exists cabin_id uuid references cabins(id) on delete set null;
alter table maintenance_categories add column if not exists dock_id uuid references docks(id) on delete set null;

alter table maintenance_categories drop constraint if exists maintenance_categories_single_target;
alter table maintenance_categories add constraint maintenance_categories_single_target
  check (num_nonnulls(cabin_id, dock_id) <= 1);

-- One category per active cabin/lean-to
insert into maintenance_categories (name, icon, sort_order, cabin_id)
select c.name, 'Home', 10 + c.sort_order, c.id
from cabins c
where c.is_active
  and not exists (select 1 from maintenance_categories mc where mc.name = c.name and mc.cabin_id = c.id);

-- One category per dock
insert into maintenance_categories (name, icon, sort_order, dock_id)
select d.name, 'Anchor', 20 + d.sort_order, d.id
from docks d
where not exists (select 1 from maintenance_categories mc where mc.name = d.name and mc.dock_id = d.id);

-- 3. Auto-improvement on task completion
-- Hidden dedup column so one task ever writes at most one improvement, even if
-- the task is reopened and completed again.
alter table cabin_improvements add column if not exists source_task_id uuid references maintenance_tasks(id) on delete set null;
drop index if exists cabin_improvements_source_task_id_key;
create unique index if not exists cabin_improvements_source_task_id_key
  on cabin_improvements (source_task_id);

create or replace function maintenance_done_writes_cabin_improvement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cabin_id uuid;
begin
  if (TG_OP = 'INSERT' and NEW.status = 'done')
     or (TG_OP = 'UPDATE' and NEW.status = 'done' and OLD.status is distinct from 'done') then
    select cabin_id into v_cabin_id
    from maintenance_categories
    where id = NEW.category_id;

    if v_cabin_id is not null then
      insert into cabin_improvements (cabin_id, year, description, source_task_id)
      values (
        v_cabin_id,
        extract(year from now())::int,
        coalesce(nullif(trim(NEW.title), ''), 'Maintenance completed'),
        NEW.id
      )
      on conflict (source_task_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists maintenance_done_writes_cabin_improvement_trigger on maintenance_tasks;
create trigger maintenance_done_writes_cabin_improvement_trigger
  after insert or update of status on maintenance_tasks
  for each row execute function maintenance_done_writes_cabin_improvement();
