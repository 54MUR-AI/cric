create table if not exists map_pins (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  type text not null default 'other',
  latitude double precision not null,
  longitude double precision not null,
  description text,
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

insert into map_pins (label, type, latitude, longitude, description) values
  ('Main House', 'cabin', 44.226, -74.832, 'Main cabin / gathering house'),
  ('Toad Hall', 'cabin', 44.224, -74.835, 'Guest cabin'),
  ('Loon Lodge', 'cabin', 44.221, -74.836, 'Lakeside cabin'),
  ('The Bunkhouse', 'cabin', 44.223, -74.830, 'Bunkhouse sleeping quarters'),
  ('Boathouse', 'boathouse', 44.225, -74.833, 'Boat storage and dock area'),
  ('Main Dock', 'dock', 44.2255, -74.8325, 'Primary docking area'),
  ('Lean-to', 'lean-to', 44.222, -74.833, 'Campsite lean-to shelter'),
  ('Firepit', 'firepit', 44.2235, -74.834, 'Main campfire circle');
