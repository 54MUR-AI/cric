-- Add the two lean-tos as bookable cabins so they appear on the cabins page
-- and scheduling page, ordered after the existing cabins via sort_order.
insert into cabins (name, description, color, is_active, sort_order)
values
  ('Bobby''s Lean-to', 'Open three-sided Adirondack lean-to.', '#d97706', true, 5),
  ('Firepit Lean-to', 'Open three-sided Adirondack lean-to.', '#d97706', true, 6);

-- Link the existing lean-to map pins to their new cabin rows so the cabins page
-- shows their location/photo and map popups show booking info.
update map_pins
set cabin_id = c.id
from cabins c
where map_pins.type = 'lean-to'
  and map_pins.cabin_id is null
  and lower(map_pins.label) = lower(c.name);
