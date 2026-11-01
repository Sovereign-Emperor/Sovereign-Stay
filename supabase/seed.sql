-- Safe, reusable lookup data only. Never seed demonstration accommodation
-- listings into a project that might be connected to the public application.

insert into public.roles (role_key, display_name)
values
  ('student', 'Student'),
  ('provider', 'Provider'),
  ('admin', 'Administrator')
on conflict (role_key) do update
set display_name = excluded.display_name;

insert into public.room_types (type_key, display_name, default_occupancy)
values
  ('single', '1 in a room', 1),
  ('double', '2 in a room', 2),
  ('triple', '3 in a room', 3),
  ('quad', '4 in a room', 4)
on conflict (type_key) do update
set display_name = excluded.display_name,
    default_occupancy = excluded.default_occupancy;

insert into public.facilities (facility_key, display_name)
values
  ('wifi', 'Wi-Fi'),
  ('water', 'Water'),
  ('security', 'Security'),
  ('study-area', 'Study area'),
  ('kitchen', 'Kitchen'),
  ('laundry', 'Laundry'),
  ('private-bathroom', 'Private bathroom'),
  ('air-conditioning', 'Air conditioning')
on conflict (facility_key) do update
set display_name = excluded.display_name;
