/*
# Create suppliers table for Omega Solutions ERP

1. New Tables
- `suppliers` — stores supplier records for each company (tenant)
  - id (uuid PK)
  - company_id (uuid FK to companies, NOT NULL)
  - name (varchar 200, NOT NULL)
  - email (citext, optional, unique per company)
  - phone (varchar 30, optional)
  - city, county, address_line1, postal_code (optional)
  - contact_person (varchar 100, optional)
  - payment_terms (varchar 100, optional)
  - outstanding_balance (numeric, default 0)
  - status (varchar 20, default 'active', CHECK active/inactive/blocked)
  - is_active (boolean, default true)
  - created_at, updated_at (timestamptz)

2. Indexes
- idx on company_id
- unique index on (company_id, email) where email is not null

3. Security
- RLS enabled, defense-in-depth (backend uses service role)
*/

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
