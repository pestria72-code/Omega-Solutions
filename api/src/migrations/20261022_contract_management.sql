CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('customer','supplier')),
  counterparty_customer_id UUID NULL,
  counterparty_supplier_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','active','suspended','completed','expired','terminated')),
  description TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE NULL,
  currency CHAR(3) NOT NULL DEFAULT 'KES',
  contract_value NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (contract_value >= 0),
  monthly_budget NUMERIC(14,2) NULL CHECK (monthly_budget IS NULL OR monthly_budget >= 0),
  owner_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contracts_dates_valid CHECK (end_date >= start_date),
  CONSTRAINT contracts_counterparty_valid CHECK (
    (contract_type = 'customer' AND counterparty_supplier_id IS NULL) OR
    (contract_type = 'supplier' AND counterparty_customer_id IS NULL)
  ),
  CONSTRAINT contracts_company_number_unique UNIQUE (company_id, contract_number)
);
CREATE INDEX IF NOT EXISTS contracts_company_status_idx ON contracts(company_id, status, end_date);
CREATE INDEX IF NOT EXISTS contracts_company_branch_idx ON contracts(company_id, branch_id);
CREATE TABLE IF NOT EXISTS contract_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('material','service','labour','other')),
  product_id UUID NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit TEXT NULL,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  frequency TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('once','daily','weekly','monthly','quarterly','annually')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (company_id, contract_id) REFERENCES contracts(company_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS contract_items_contract_idx ON contract_items(company_id, contract_id);
CREATE TABLE IF NOT EXISTS contract_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL,
  title TEXT NOT NULL,
  due_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','waived')),
  notes TEXT NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (company_id, contract_id) REFERENCES contracts(company_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS contract_obligations_due_idx ON contract_obligations(company_id, due_date, status);
