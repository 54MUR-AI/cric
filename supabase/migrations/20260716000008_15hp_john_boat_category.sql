-- Add a maintenance category for the island's other boat (the 15HP John Boat),
-- grouped with the existing Pontoon (Dr. Fun) boat category at the front.

insert into maintenance_categories (name, icon, sort_order)
select '15HP John Boat', 'Sailboat', 1
where not exists (select 1 from maintenance_categories where name = '15HP John Boat');
