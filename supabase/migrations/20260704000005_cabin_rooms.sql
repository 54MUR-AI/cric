-- Add room-level booking support for Bat Manor

-- 1. Add has_rooms flag to cabins
alter table cabins add column if not exists has_rooms boolean not null default false;
update cabins set has_rooms = true where name = 'Bat Manor';

-- 2. Add room column to bookings (nullable, only for Bat Manor)
alter table bookings add column if not exists room text;

-- 3. Drop the old auto-named exclusion constraint (cabin-level for all)
-- PostgreSQL names inline exclusion constraints as {table}_{col1}_{col2}_excl
alter table bookings drop constraint if exists bookings_cabin_id_daterange_excl;

-- 4. New constraint 1: non-room bookings — cabin-level overlap (Loon Lodge, Toad Hall, Bunkhouse, or Bat Manor whole-cabin if needed)
alter table bookings add constraint bookings_cabin_no_overlap
exclude using gist (
  cabin_id with =,
  daterange(start_date, end_date, '[]') with &&
) where (room is null);

-- 5. New constraint 2: room bookings — (cabin + room)-level overlap (Bat Manor rooms only)
alter table bookings add constraint bookings_room_no_overlap
exclude using gist (
  cabin_id with =,
  room with =,
  daterange(start_date, end_date, '[]') with &&
) where (room is not null);
