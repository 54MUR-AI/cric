-- Set location to Zoom for virtual meetings, remove (Zoom) from titles

update meetings set location = 'Zoom' where id in (
  'e88c43ef-a7d5-4121-9178-116bbcdbd1c3',
  '04f56891-950b-4521-b14a-670217095428'
);

update meetings set title = regexp_replace(title, ' \(Zoom\)$', '') where id in (
  '0fa0e234-74c1-466f-ad71-d5a94f6b561d',
  '8dc993d8-c59f-4058-9fc5-e532f835ead6',
  'c25d5bac-dd30-418c-8e4e-a021c52882aa',
  'af9f0019-80e8-497c-8856-2b67e793553a',
  'e88c43ef-a7d5-4121-9178-116bbcdbd1c3',
  '04f56891-950b-4521-b14a-670217095428'
);
