-- Update legacy names to the current territorial naming
UPDATE "veredas"
SET "name" = 'Piedras Blancas – Matasano'
WHERE "id" = '44444444-4444-4444-4444-444444444444';

UPDATE "veredas"
SET "name" = 'Santa Elena (Sector Central)'
WHERE "id" = '77777777-7777-7777-7777-777777777777';

-- Insert missing veredas of the current catalog if they do not already exist
INSERT INTO "veredas" ("id", "community_id", "name", "lat_approx", "lng_approx")
VALUES
  ('99999991-9999-4999-8999-999999999991', '00000000-0000-0000-0000-000000000001', 'Mazo', 6.2390, -75.4750),
  ('99999992-9999-4999-8999-999999999992', '00000000-0000-0000-0000-000000000001', 'Piedra Gorda', 6.2250, -75.4860),
  ('99999993-9999-4999-8999-999999999993', '00000000-0000-0000-0000-000000000001', 'El Plan', 6.2170, -75.5030),
  ('99999994-9999-4999-8999-999999999994', '00000000-0000-0000-0000-000000000001', 'Las Palmas', 6.2140, -75.5570),
  ('99999995-9999-4999-8999-999999999995', '00000000-0000-0000-0000-000000000001', 'San Miguel', 6.2450, -75.4500),
  ('99999996-9999-4999-8999-999999999996', '00000000-0000-0000-0000-000000000001', 'Perico', 6.1880, -75.5400)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "lat_approx" = EXCLUDED."lat_approx",
  "lng_approx" = EXCLUDED."lng_approx";
