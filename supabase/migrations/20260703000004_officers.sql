-- Corporate officers (Chair, Treasurer, Secretary, etc.)
create table if not exists officers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id)
);

alter table officers enable row level security;

create policy "Officers readable by all authenticated users"
  on officers for select using (auth.role() = 'authenticated');

create policy "Officers writable by super admin"
  on officers for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
