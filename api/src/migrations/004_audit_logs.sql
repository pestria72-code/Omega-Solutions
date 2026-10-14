-- 004_audit_logs.sql
-- Append-only audit trail. INSERT only — no UPDATE or DELETE.
-- Every financial and admin action is logged here.

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

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
