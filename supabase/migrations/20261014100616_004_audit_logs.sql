/*
# Create Audit Logs Table

1. New Tables
- `audit_logs` — Append-only audit trail for all financial and admin actions
  - Columns: id, user_id, company_id, branch_id, action, entity_type, entity_id, old_values (JSONB), new_values (JSONB), ip_address, created_at
  - user_id, company_id, branch_id are nullable with ON DELETE SET NULL (preserve audit history even if entity is deleted)
2. Indexes
- idx_audit_user_id on audit_logs(user_id)
- idx_audit_company_id on audit_logs(company_id)
- idx_audit_entity on audit_logs(entity_type, entity_id)
- idx_audit_created_at on audit_logs(created_at)
3. Security
- RLS enabled (locked down — NestJS backend uses service-role connection that bypasses RLS)
4. Notes
- INSERT only — no UPDATE or DELETE operations expected
- Safe to run multiple times (IF NOT EXISTS)
*/

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       VARCHAR(100),
  old_values      JSONB,
  new_values      JSONB,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
