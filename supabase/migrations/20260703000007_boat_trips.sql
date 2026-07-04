-- Boat trips for Dr Fun (pontoon) scheduling
create table if not exists boat_trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id) on delete cascade not null,
  trip_date date not null,
  departure_time time not null,
  return_time time,
  destination text not null default 'The Foot (Cranberry Lake)',
  passengers integer not null default 1,
  notes text,
  gas_fee_paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- Allow users to see all trips, modify their own
alter table boat_trips enable row level security;

create policy "Anyone can view boat trips"
  on boat_trips for select
  using (true);

create policy "Users can insert their own trips"
  on boat_trips for insert
  with check (auth.uid() = created_by);

create policy "Users can update their own trips"
  on boat_trips for update
  using (auth.uid() = created_by);

create policy "Users can delete their own trips"
  on boat_trips for delete
  using (auth.uid() = created_by);
