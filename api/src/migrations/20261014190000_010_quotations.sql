CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  quotation_number VARCHAR(40) NOT NULL,
  issue_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled', 'converted')),
  currency VARCHAR(3) NOT NULL DEFAULT 'KES',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes VARCHAR(2000),
  converted_invoice_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quotations_customer_company_fk FOREIGN KEY (customer_id, company_id)
    REFERENCES customers(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT quotations_company_number_unique UNIQUE (company_id, quotation_number)
);
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL,
  product_id UUID,
  product_name VARCHAR(200) NOT NULL,
  sku VARCHAR(50),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  line_subtotal NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL,
  line_total NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quotation_items_quotation_company_fk FOREIGN KEY (quotation_id, company_id)
    REFERENCES quotations(id, company_id) ON DELETE CASCADE,
  CONSTRAINT quotation_items_product_company_fk FOREIGN KEY (product_id, company_id)
    REFERENCES products(id, company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_quotations_company_created ON quotations(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_company_status ON quotations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_company_quotation ON quotation_items(company_id, quotation_id);
CREATE TABLE IF NOT EXISTS quotation_sequences (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quotation_year INTEGER NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1 CHECK (next_number > 0),
  PRIMARY KEY (company_id, quotation_year)
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
