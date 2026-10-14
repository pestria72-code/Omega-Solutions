-- 008_products_and_sales.sql
-- Product catalog and persisted sales documents. Additive and safe to re-run.

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description VARCHAR(2000),
  category VARCHAR(100),
  unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
  selling_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  cost_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reorder_level NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  is_service BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_products_company_sku UNIQUE (company_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_name ON products(company_id, name);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(40) NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  currency VARCHAR(3) NOT NULL DEFAULT 'KES',
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invoices_company_number UNIQUE (company_id, invoice_number),
  CONSTRAINT chk_invoice_paid_not_over_total CHECK (amount_paid <= total)
);
CREATE INDEX IF NOT EXISTS idx_invoices_company_created ON invoices(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_company_customer ON invoices(company_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  sku VARCHAR(50),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  line_subtotal NUMERIC(14,2) NOT NULL CHECK (line_subtotal >= 0),
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_company_invoice ON invoice_items(company_id, invoice_id);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  reference VARCHAR(100),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_company_invoice ON invoice_payments(company_id, invoice_id);

-- The API always scopes records to the authenticated user's company.
