/*
# Create customers table for Omega Solutions ERP

1. New Tables
- `customers` — stores customer records for each company (tenant)
  - `id` (uuid, primary key)
  - `company_id` (uuid, foreign key to companies, NOT NULL)
  - `name` (varchar 200, NOT NULL)
  - `email` (citext, optional)
  - `phone` (varchar 30, optional)
  - `city` (varchar 100, optional)
  - `county` (varchar 100, optional)
  - `address_line1` (varchar 200, optional)
  - `postal_code` (varchar 20, optional)
  - `credit_limit` (numeric, default 0)
  - `outstanding_balance` (numeric, default 0)
  - `status` (varchar 20, default 'active', CHECK in active/inactive/blocked)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz, default now)

2. Indexes
- Index on company_id for tenant-scoped queries
- Unique constraint on (company_id, email) to prevent duplicate customers per company

3. Security
- Enable RLS on customers table
- The NestJS backend uses the service role key which bypasses RLS
- RLS policies deny direct access from anon/authenticated roles as a defense-in-depth measure
- All customer access goes through the NestJS API which enforces company membership

4. Important Notes
- This table is multi-tenant: every row belongs to a company via company_id
- The backend enforces tenant isolation by checking company_memberships before any query
- No seed data is inserted — the table starts empty
*/

CREATE TABLE IF NOT EXISTS customers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                VARCHAR(200) NOT NULL,
  email               CITEXT,
  phone               VARCHAR(30),
  city                VARCHAR(100),
  county              VARCHAR(100),
  address_line1       VARCHAR(200),
  postal_code         VARCHAR(20),
  credit_limit        NUMERIC(14,2) NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_company_email ON customers(company_id, email) WHERE email IS NOT NULL;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
