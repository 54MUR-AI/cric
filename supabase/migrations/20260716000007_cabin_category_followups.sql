-- Follow-up to cabin/dock maintenance categories:
-- 1. Give every cabin/lean-to a category regardless of active status
--    (inactive cabins still need maintenance tasks tracked against them).
-- 2. Merge the old general "Boat House" category into the dock-linked
--    "Boathouse" category so there is a single source for boathouse work.

-- 1. Categories for all cabins, active or not.
insert into maintenance_categories (name, icon, sort_order, cabin_id)
select c.name, 'Home', 10 + c.sort_order, c.id
from cabins c
where not exists (
  select 1 from maintenance_categories mc
  where mc.name = c.name and mc.cabin_id = c.id
);

-- 2. Reassign any tasks off the general "Boat House" category, then drop it.
update maintenance_tasks t
set category_id = boathouse.id
from maintenance_categories boat_house, maintenance_categories boathouse
where t.category_id = boat_house.id
  and boat_house.name = 'Boat House' and boat_house.cabin_id is null and boat_house.dock_id is null
  and boathouse.name = 'Boathouse' and boathouse.dock_id is not null;

delete from maintenance_categories
where name = 'Boat House' and cabin_id is null and dock_id is null;
