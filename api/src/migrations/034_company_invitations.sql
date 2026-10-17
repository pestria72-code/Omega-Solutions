-- 034_company_invitations.sql
-- Company-scoped invitations. This file is committed for review; deployment must not
-- apply it to Neon until the database migration is explicitly approved.
CREATE TABLE IF NOT EXISTS company_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  email CITEXT NOT NULL,
  role user_role NOT NULL,
  branch_id UUID,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_invitations_branch_fk
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);
CREATE INDEX IF NOT EXISTS idx_company_invitations_company_created
  ON company_invitations(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email
  ON company_invitations(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_invitations_pending_email
  ON company_invitations(company_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
