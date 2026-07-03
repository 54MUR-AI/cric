-- CRIC Island Manager - Supabase Migration
-- Run this in the Supabase SQL editor to set up the database

-- 0. Extensions
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- 1. Cabins (configurable)
create table if not exists cabins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text not null default '#3b82f6',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Profiles (syncs with auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. Bookings
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references cabins(id) on delete restrict,
  user_id uuid not null references profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint valid_dates check (end_date >= start_date),
  exclude using gist (
    cabin_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
);

-- 4. Maintenance categories
create table if not exists maintenance_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 5. Maintenance tasks
create type task_status as enum ('todo', 'in_progress', 'done');

create table if not exists maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references maintenance_categories(id) on delete restrict,
  title text not null,
  description text,
  status task_status not null default 'todo',
  assigned_to uuid references profiles(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 6. Maintenance comments (threaded)
create table if not exists maintenance_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references maintenance_tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  parent_id uuid references maintenance_comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 7. Meetings
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  location text,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 8. Meeting agenda items
create type vote_outcome as enum ('passed', 'failed', 'tabled');

create table if not exists meeting_agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  title text not null,
  description text,
  proposer text,
  seconder text,
  vote_yes int not null default 0,
  vote_no int not null default 0,
  vote_abstain int not null default 0,
  outcome vote_outcome,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 9. Profiles trigger (auto-create on signup)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 10. Row Level Security
alter table cabins enable row level security;
alter table profiles enable row level security;
alter table bookings enable row level security;
alter table maintenance_categories enable row level security;
alter table maintenance_tasks enable row level security;
alter table maintenance_comments enable row level security;
alter table meetings enable row level security;
alter table meeting_agenda_items enable row level security;

-- Cabins: anyone can read, any authenticated user can write
create policy "Cabins are readable by all authenticated users"
  on cabins for select using (auth.role() = 'authenticated');
create policy "Cabins are writable by all authenticated users"
  on cabins for all using (auth.role() = 'authenticated');

-- Profiles: read all, update own
create policy "Profiles are readable by all authenticated users"
  on profiles for select using (auth.role() = 'authenticated');
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Bookings: CRUD by any authenticated user
create policy "Bookings are readable by all authenticated users"
  on bookings for select using (auth.role() = 'authenticated');
create policy "Bookings are writable by all authenticated users"
  on bookings for all using (auth.role() = 'authenticated');

-- Maintenance categories
create policy "Categories readable by all authenticated users"
  on maintenance_categories for select using (auth.role() = 'authenticated');
create policy "Categories writable by all authenticated users"
  on maintenance_categories for all using (auth.role() = 'authenticated');

-- Maintenance tasks
create policy "Tasks readable by all authenticated users"
  on maintenance_tasks for select using (auth.role() = 'authenticated');
create policy "Tasks writable by all authenticated users"
  on maintenance_tasks for all using (auth.role() = 'authenticated');

-- Maintenance comments
create policy "Comments readable by all authenticated users"
  on maintenance_comments for select using (auth.role() = 'authenticated');
create policy "Comments writable by all authenticated users"
  on maintenance_comments for all using (auth.role() = 'authenticated');

-- Meetings: update restricted to 7 days
create policy "Meetings readable by all authenticated users"
  on meetings for select using (auth.role() = 'authenticated');
create policy "Meetings writable by all authenticated users"
  on meetings for insert with check (auth.role() = 'authenticated');
create policy "Meetings updatable within 7 days"
  on meetings for update using (
    auth.role() = 'authenticated'
    and created_at > now() - interval '7 days'
  );

-- Meeting agenda items
create policy "Agenda items readable by all authenticated users"
  on meeting_agenda_items for select using (auth.role() = 'authenticated');
create policy "Agenda items writable by all authenticated users"
  on meeting_agenda_items for insert with check (auth.role() = 'authenticated');
create policy "Agenda items updatable within 7 days"
  on meeting_agenda_items for update using (
    auth.role() = 'authenticated'
    and created_at > now() - interval '7 days'
  );
