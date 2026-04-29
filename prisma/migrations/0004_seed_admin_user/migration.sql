INSERT INTO "users" (
  "id",
  "community_id",
  "email",
  "phone",
  "name",
  "password_hash",
  "role",
  "status",
  "phone_verified",
  "is_verified_provider"
)
VALUES (
  '99999999-9999-4999-8999-999999999999',
  '00000000-0000-0000-0000-000000000001',
  'hahiguit@gmail.com',
  '3001112233',
  'Hector Higuita',
  'pbkdf2:bfe1ddc74b5ade5d061ec359ffd81451:0d02af327d8d8d1461a5e3796b6300def2aa9f534d5829a355c51015f98a8afc',
  'admin',
  'active',
  true,
  true
)
ON CONFLICT ("id") DO NOTHING;
