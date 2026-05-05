-- Clear avatar URLs that point to localhost (dev fallback from missing S3 config).
-- These URLs were stored when S3_BUCKET_NAME was not set, causing storage.ts to
-- return http://localhost:3000/uploads/... which is never reachable in production.
UPDATE "User"
SET "avatarUrl" = NULL
WHERE "avatarUrl" LIKE 'http://localhost%';
