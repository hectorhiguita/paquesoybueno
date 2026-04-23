-- Enable Row-Level Security on all business tables
-- Run this after the initial Prisma migration

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE veredas ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vereda_follows ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current community_id from the JWT claim
CREATE OR REPLACE FUNCTION current_community_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.community_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- RLS Policies: filter by community_id

-- users
CREATE POLICY users_community_isolation ON users
  USING (community_id = current_community_id());

-- veredas
CREATE POLICY veredas_community_isolation ON veredas
  USING (community_id = current_community_id());

-- categories
CREATE POLICY categories_community_isolation ON categories
  USING (community_id = current_community_id());

-- listings
CREATE POLICY listings_community_isolation ON listings
  USING (community_id = current_community_id());

-- listing_images (via listing)
CREATE POLICY listing_images_community_isolation ON listing_images
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE community_id = current_community_id()
    )
  );

-- ratings
CREATE POLICY ratings_community_isolation ON ratings
  USING (community_id = current_community_id());

-- message_threads
CREATE POLICY message_threads_community_isolation ON message_threads
  USING (community_id = current_community_id());

-- messages
CREATE POLICY messages_community_isolation ON messages
  USING (community_id = current_community_id());

-- notifications
CREATE POLICY notifications_community_isolation ON notifications
  USING (community_id = current_community_id());

-- reports
CREATE POLICY reports_community_isolation ON reports
  USING (community_id = current_community_id());

-- reservations
CREATE POLICY reservations_community_isolation ON reservations
  USING (community_id = current_community_id());

-- vereda_follows (via vereda)
CREATE POLICY vereda_follows_community_isolation ON vereda_follows
  USING (
    vereda_id IN (
      SELECT id FROM veredas WHERE community_id = current_community_id()
    )
  );

-- Trigger to maintain active_report_count on users
CREATE OR REPLACE FUNCTION update_user_active_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users
    SET active_report_count = active_report_count + 1
    WHERE id = NEW.target_user_id AND NEW.target_user_id IS NOT NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- When a report is resolved or dismissed, decrement the count
    IF OLD.status = 'pending' AND NEW.status IN ('resolved', 'dismissed') THEN
      UPDATE users
      SET active_report_count = GREATEST(0, active_report_count - 1)
      WHERE id = NEW.target_user_id AND NEW.target_user_id IS NOT NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_active_report_count
  AFTER INSERT OR UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_user_active_report_count();
