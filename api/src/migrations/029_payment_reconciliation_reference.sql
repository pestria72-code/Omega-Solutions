ALTER TABLE invoice_payments
  ADD COLUMN IF NOT EXISTS reconciliation_reference VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_reconciled
  ON invoice_payments(company_id, reconciled_at DESC)
  WHERE reconciled_at IS NOT NULL;
