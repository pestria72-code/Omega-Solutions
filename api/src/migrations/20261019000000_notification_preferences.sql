CREATE TABLE IF NOT EXISTS notification_preferences (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  preferences JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, user_id),
  CONSTRAINT notification_preferences_object CHECK (jsonb_typeof(preferences) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON notification_preferences (user_id, company_id);
