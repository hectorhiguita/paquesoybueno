-- Asegura que hahiguit@gmail.com tenga rol admin en la comunidad de Santa Elena.
-- El INSERT original de la migración 0004 puede haberse perdido si el usuario ya
-- existía con un registro diferente creado por el flujo normal de registro.
UPDATE "users"
SET "role" = 'admin'
WHERE "email" = 'hahiguit@gmail.com'
  AND "community_id" = '00000000-0000-0000-0000-000000000001';
