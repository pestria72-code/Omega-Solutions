-- 038_notifications.sql
-- Persist company-scoped notifications for the intended recipient.
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message VARCHAR(1000) NOT NULL DEFAULT '',
  href VARCHAR(500),
  notification_type VARCHAR(80) NOT NULL DEFAULT 'general',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(company_id, user_id, read_at, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
