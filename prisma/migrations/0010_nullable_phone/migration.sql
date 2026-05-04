-- Make phone nullable so Google OAuth users can be created before completing their profile
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
