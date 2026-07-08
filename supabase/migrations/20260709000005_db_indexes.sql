-- Indexes for common query/filter/sort patterns.
create index if not exists idx_photos_taken_at on photos (taken_at desc, created_at desc);
create index if not exists idx_photos_album_id on photos (album_id);
create index if not exists idx_bookings_created_at on bookings (created_at);
create index if not exists idx_maintenance_tasks_created_at on maintenance_tasks (created_at);
create index if not exists idx_maintenance_tasks_category_id on maintenance_tasks (category_id);
create index if not exists idx_maintenance_tasks_assigned_to on maintenance_tasks (assigned_to);
create index if not exists idx_maintenance_tasks_created_by on maintenance_tasks (created_by);
create index if not exists idx_boat_trips_created_at on boat_trips (created_at);
create index if not exists idx_map_pins_label on map_pins (label);
