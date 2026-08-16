-- Cabin room photos: link photos to a cabin so each cabin can show a
-- carousel of its rooms. Uploading a new set replaces the old photos.

alter table photos add column if not exists cabin_id uuid references cabins(id) on delete cascade;

create index if not exists photos_cabin_id_idx on photos (cabin_id);
