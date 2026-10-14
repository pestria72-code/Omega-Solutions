-- 007_suppliers_table.sql
CREATE TABLE IF NOT EXISTS suppliers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                VARCHAR(200) NOT NULL,
  email               CITEXT,
  phone               VARCHAR(30),
  city                VARCHAR(100),
  county              VARCHAR(100),
  address_line1       VARCHAR(200),
  postal_code         VARCHAR(20),
  contact_person      VARCHAR(100),
  payment_terms       VARCHAR(100),
  outstanding_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_company_email ON suppliers(company_id, email) WHERE email IS NOT NULL;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
