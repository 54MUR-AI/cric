-- Cabin improvement history, previously hardcoded in the Cabins page. Moving it
-- to a table so the Cabins page and map pin popups share the same data.

create table if not exists cabin_improvements (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references cabins(id) on delete cascade,
  year integer not null,
  description text not null,
  created_at timestamptz not null default now()
);

alter table cabin_improvements enable row level security;

create policy "Improvements readable by all authenticated users"
  on cabin_improvements for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage improvements"
  on cabin_improvements for all
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- Seed the history that used to live in CabinsPage.jsx (IMPROVEMENTS map).
-- "Main House" improvements belong to Bat Manor.
insert into cabin_improvements (cabin_id, year, description)
select c.id, v.year, v.description
from (values
  ('Bat Manor', 2024, 'Foundation work started (trenches dug, 6-ft concrete beams poured)'),
  ('Bat Manor', 2022, 'Engineering study by North Woods Engineering (~$2,300)'),
  ('Bat Manor', 2020, 'Log pest treatment (powder post beetles)'),
  ('Bat Manor', 2018, 'New fridge'),
  ('Bat Manor', 2017, 'New water heater'),
  ('Toad Hall', 2023, 'New septic + 3 propane tanks with relief valves'),
  ('Toad Hall', 2022, 'Metal roof installed'),
  ('Toad Hall', 2021, 'New deck'),
  ('Loon Lodge', 2023, 'Trim repaint + deck wash'),
  ('Loon Lodge', 2022, 'Full stain + ramp boards + tree removal'),
  ('Loon Lodge', 2021, 'Loft electrified'),
  ('The Bunkhouse', 2024, 'New front windows, sliding door, metal L-piece, siding/deck repair')
) as v(name, year, description)
join cabins c on c.name = v.name
where not exists (
  select 1 from cabin_improvements ci
  where ci.cabin_id = c.id and ci.year = v.year and ci.description = v.description
);
