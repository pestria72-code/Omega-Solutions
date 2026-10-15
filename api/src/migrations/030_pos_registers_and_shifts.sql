-- POS register and cashier-shift foundation. Sales remain linked to the existing invoice/payment ledger.
CREATE TABLE IF NOT EXISTS pos_registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pos_register_company_code_unique UNIQUE(company_id, code),
  CONSTRAINT pos_register_company_id_unique UNIQUE(id, company_id),
  CONSTRAINT pos_register_branch_company_fk FOREIGN KEY(branch_id, company_id)
    REFERENCES branches(id, company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_pos_registers_company_active ON pos_registers(company_id, is_active, name);

CREATE TABLE IF NOT EXISTS pos_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  register_id UUID NOT NULL,
  opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  closed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  opening_float NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(opening_float >= 0),
  expected_cash NUMERIC(14,2),
  counted_cash NUMERIC(14,2) CHECK(counted_cash IS NULL OR counted_cash >= 0),
  cash_difference NUMERIC(14,2),
  status VARCHAR(12) NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT pos_shift_register_company_fk FOREIGN KEY(register_id, company_id)
    REFERENCES pos_registers(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT pos_shift_close_state CHECK(
    (status='open' AND closed_at IS NULL AND closed_by IS NULL AND counted_cash IS NULL)
    OR (status='closed' AND closed_at IS NOT NULL AND closed_by IS NOT NULL AND counted_cash IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_company_opened ON pos_shifts(company_id, opened_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_one_open_shift_per_register
  ON pos_shifts(register_id) WHERE status='open';
ALTER TABLE pos_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;
