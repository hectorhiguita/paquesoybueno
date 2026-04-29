INSERT INTO "communities" ("id", "name", "slug", "active")
VALUES ('00000000-0000-0000-0000-000000000001', 'Santa Elena', 'santa-elena', true);

INSERT INTO "veredas" ("id", "community_id", "name", "lat_approx", "lng_approx")
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Barro Blanco', 6.2285, -75.5012),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'El Placer', 6.2201, -75.4978),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'El Llano', 6.2150, -75.5100),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Piedras Blancas', 6.2350, -75.4900),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000001', 'Media Luna', 6.2420, -75.5050),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000001', 'El Cerro', 6.2480, -75.4850),
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000001', 'Santa Elena Centro', 6.2300, -75.4950),
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000001', 'Pantanillo', 6.2100, -75.5200);

INSERT INTO "categories" ("id", "community_id", "name", "icon", "description", "active")
VALUES
  ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '00000000-0000-0000-0000-000000000001', 'Jardinería', '🌿', 'Servicios de jardinería y huertas', true),
  ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '00000000-0000-0000-0000-000000000001', 'Electricidad', '⚡', 'Instalaciones y reparaciones eléctricas', true),
  ('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '00000000-0000-0000-0000-000000000001', 'Plomería', '🔧', 'Plomería y mantenimiento del hogar', true),
  ('aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '00000000-0000-0000-0000-000000000001', 'Construcción', '🏠', 'Obras y arreglos de construcción', true),
  ('aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '00000000-0000-0000-0000-000000000001', 'Tecnología', '📱', 'Soporte técnico y tecnología', true),
  ('aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6', '00000000-0000-0000-0000-000000000001', 'Transporte', '🚗', 'Transporte y carga', true),
  ('aaaaaaa7-aaaa-4aaa-8aaa-aaaaaaaaaaa7', '00000000-0000-0000-0000-000000000001', 'Cocina', '🍳', 'Alimentos y cocina', true),
  ('aaaaaaa8-aaaa-4aaa-8aaa-aaaaaaaaaaa8', '00000000-0000-0000-0000-000000000001', 'Electrodomésticos', '🔌', 'Reparación y venta de electrodomésticos', true);
