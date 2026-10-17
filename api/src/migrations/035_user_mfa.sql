-- 035_user_mfa.sql
-- Server-side MFA state. Apply only through an explicitly approved non-production migration.
CREATE TABLE IF NOT EXISTS user_mfa (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_encrypted TEXT,
  pending_secret_encrypted TEXT,
  enabled_at TIMESTAMPTZ,
  recovery_code_hashes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
