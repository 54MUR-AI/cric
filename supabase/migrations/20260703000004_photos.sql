create table if not exists photo_albums (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  cover_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists photos (
  id uuid default gen_random_uuid() primary key,
  storage_path text not null,
  url text not null,
  thumbnail_url text,
  caption text,
  taken_at timestamptz,
  width integer,
  height integer,
  album_id uuid references photo_albums(id) on delete set null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table photo_albums enable row level security;
alter table photos enable row level security;

create policy "Albums are viewable by everyone"
  on photo_albums for select using (true);

create policy "Authenticated users can create albums"
  on photo_albums for insert
  with check (auth.role() = 'authenticated');

create policy "Photos are viewable by everyone"
  on photos for select using (true);

create policy "Authenticated users can upload photos"
  on photos for insert
  with check (auth.role() = 'authenticated');

create policy "Users can delete their own photos"
  on photos for delete
  using (auth.uid() = uploaded_by);

alter table map_pins add column if not exists image_url text;
alter table map_pins add column if not exists updated_at timestamptz default now();
