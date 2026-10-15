-- Payment records must not affect receivables or the general ledger until verified.
-- Existing rows are preserved as confirmed because the previous API posted them immediately.
ALTER TABLE invoice_payments
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE invoice_payments
  DROP CONSTRAINT IF EXISTS invoice_payments_status_check;
ALTER TABLE invoice_payments
  ADD CONSTRAINT invoice_payments_status_check
  CHECK (status IN ('pending','confirmed','rejected','reconciled'));

UPDATE invoice_payments
SET verified_at = COALESCE(verified_at, paid_at)
WHERE status = 'confirmed' AND verified_at IS NULL;

ALTER TABLE invoice_payments
  ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_invoice_payments_company_status
  ON invoice_payments(company_id, status, created_at DESC);

INSERT INTO permissions(permission, description, category) VALUES
 ('payments:verify','Verify customer payments and post confirmed receipts','accounting'),
 ('payments:reconcile','Reconcile verified payments to bank statements','accounting')
ON CONFLICT(permission) DO NOTHING;

INSERT INTO role_permissions(role,permission_id)
SELECT 'owner',id FROM permissions WHERE permission IN ('payments:verify','payments:reconcile')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'admin',id FROM permissions WHERE permission IN ('payments:verify','payments:reconcile')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'manager',id FROM permissions WHERE permission='payments:verify'
ON CONFLICT(role,permission_id) DO NOTHING;
