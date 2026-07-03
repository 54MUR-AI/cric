create table if not exists map_pins (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  type text not null default 'other',
  latitude double precision not null,
  longitude double precision not null,
  description text,
  cabin_id uuid references cabins(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table map_pins enable row level security;

create policy "Pins are viewable by everyone"
  on map_pins for select
  using (true);

create policy "Admins can insert pins"
  on map_pins for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete pins"
  on map_pins for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
