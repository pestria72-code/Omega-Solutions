ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS pos_shift_id UUID;
-- POS checkout linkage and composite tenant constraints for sale relationships.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pos_shifts_id_company_unique') THEN
    ALTER TABLE pos_shifts ADD CONSTRAINT pos_shifts_id_company_unique UNIQUE(id,company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoices_id_company_unique') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_id_company_unique UNIQUE(id,company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoice_payments_pos_shift_company_fk') THEN
    ALTER TABLE invoice_payments ADD CONSTRAINT invoice_payments_pos_shift_company_fk
      FOREIGN KEY(pos_shift_id,company_id) REFERENCES pos_shifts(id,company_id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS pos_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL,
  register_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  sale_number VARCHAR(40) NOT NULL,
  request_id UUID,
  subtotal NUMERIC(14,2) NOT NULL CHECK(subtotal >= 0),
  tax_amount NUMERIC(14,2) NOT NULL CHECK(tax_amount >= 0),
  total NUMERIC(14,2) NOT NULL CHECK(total >= 0),
  amount_confirmed NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(amount_confirmed >= 0),
  status VARCHAR(32) NOT NULL CHECK(status IN ('completed','awaiting_payment_confirmation','refunded','voided')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pos_sales_shift_company_fk FOREIGN KEY(shift_id,company_id) REFERENCES pos_shifts(id,company_id) ON DELETE RESTRICT,
  CONSTRAINT pos_sales_register_company_fk FOREIGN KEY(register_id,company_id) REFERENCES pos_registers(id,company_id) ON DELETE RESTRICT,
  CONSTRAINT pos_sales_warehouse_company_fk FOREIGN KEY(warehouse_id,company_id) REFERENCES warehouses(id,company_id) ON DELETE RESTRICT,
  CONSTRAINT pos_sales_invoice_company_fk FOREIGN KEY(invoice_id,company_id) REFERENCES invoices(id,company_id) ON DELETE RESTRICT,
  CONSTRAINT pos_sales_invoice_unique UNIQUE(company_id,invoice_id),
  CONSTRAINT pos_sales_number_unique UNIQUE(company_id,sale_number)
);
CREATE INDEX IF NOT EXISTS idx_pos_sales_company_created ON pos_sales(company_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_sales_shift ON pos_sales(company_id,shift_id,created_at DESC);
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;

-- Backfill existing sales before requiring idempotency keys on new checkouts.
UPDATE pos_sales SET request_id=uuid_generate_v4() WHERE request_id IS NULL;
ALTER TABLE pos_sales ALTER COLUMN request_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_sales_company_request_id ON pos_sales(company_id,request_id);
