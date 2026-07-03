-- CRIC Initial Seed Data
-- Run this AFTER the migration SQL

-- 4 Cabins
insert into cabins (name, description, color, sort_order) values
  ('Bat Manor', 'Main residence', '#7c3aed', 1),
  ('Loon Lodge', 'Lakeside cabin', '#0ea5e9', 2),
  ('Toad Hall', 'Guest cabin', '#f59e0b', 3),
  ('The Bunkhouse', 'Bunkhouse sleeping area', '#10b981', 4);

-- Maintenance categories
insert into maintenance_categories (name, icon, sort_order) values
  ('Boat House', 'Ship', 1),
  ('Pontoon (Dr. Fun)', 'Sailboat', 2),
  ('Solar System', 'Sun', 3),
  ('Propane Tanks', 'Flame', 4),
  ('General Cabin', 'Home', 5),
  ('Grounds', 'Trees', 6);

-- Seed a demo booking for context (optional - comment out if not needed)
-- insert into bookings (cabin_id, user_id, start_date, end_date, notes)
-- select c.id, p.id, '2026-07-15', '2026-07-22', 'Family reunion week'
-- from cabins c cross join profiles p
-- where c.name = 'Bat Manor' limit 1;
