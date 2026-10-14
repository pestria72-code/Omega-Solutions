/*
# Create products table for Omega Solutions ERP

1. New Tables
- `products` — stores product/service catalog items per company
  - id (uuid PK)
  - company_id (uuid FK to companies, NOT NULL)
  - sku (varchar 50, NOT NULL)
  - name (varchar 200, NOT NULL)
  - description (text, optional)
  - category (varchar 100, optional)
  - unit (varchar 20, default 'pcs')
  - selling_price (numeric 14,2, NOT NULL, default 0)
  - cost_price (numeric 14,2, default 0)
  - stock_quantity (numeric 14,2, default 0)
  - reorder_level (numeric 14,2, default 0)
  - is_service (boolean, default false)
  - is_active (boolean, default true)
  - created_at, updated_at (timestamptz)

2. Indexes
- idx on company_id
- unique on (company_id, sku)

3. Security
- RLS enabled (backend uses service role, defense-in-depth)
*/

CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku             VARCHAR(50) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category        VARCHAR(100),
  unit            VARCHAR(20) NOT NULL DEFAULT 'pcs',
  selling_price   NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost_price      NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock_quantity  NUMERIC(14,2) NOT NULL DEFAULT 0,
  reorder_level   NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_service      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_company_sku ON products(company_id, sku);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
