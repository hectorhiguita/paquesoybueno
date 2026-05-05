-- Clear avatar URLs that point to localhost (dev fallback from missing S3 config).
-- Uses a DO block to handle the case where avatar_url column does not yet exist.
DO $$
BEGIN
  UPDATE "users"
  SET "avatar_url" = NULL
  WHERE "avatar_url" LIKE 'http://localhost%';
EXCEPTION WHEN undefined_column THEN
  NULL;
END $$;
