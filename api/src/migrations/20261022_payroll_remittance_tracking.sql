CREATE TABLE IF NOT EXISTS payroll_remittance_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE RESTRICT,
  authority TEXT NOT NULL CHECK (authority IN ('PAYE', 'NSSF', 'SHIF', 'HOUSING_LEVY')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, payroll_run_id, authority),
  UNIQUE (id, company_id),
  CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS payroll_remittance_obligations_company_due_idx
  ON payroll_remittance_obligations (company_id, due_date, authority);

CREATE TABLE IF NOT EXISTS payroll_remittance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  obligation_id UUID NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_reference TEXT NOT NULL CHECK (length(trim(payment_reference)) BETWEEN 1 AND 160),
  paid_at TIMESTAMPTZ NOT NULL,
  receipt_storage_key TEXT,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (obligation_id, company_id)
    REFERENCES payroll_remittance_obligations (id, company_id) ON DELETE RESTRICT,
  UNIQUE (company_id, payment_reference)
);

CREATE INDEX IF NOT EXISTS payroll_remittance_payments_obligation_idx
  ON payroll_remittance_payments (company_id, obligation_id, paid_at);
