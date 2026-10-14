CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  source_quotation_id UUID,
  order_number VARCHAR(40) NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'processing', 'fulfilled', 'cancelled')),
  currency VARCHAR(3) NOT NULL DEFAULT 'KES',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes VARCHAR(2000),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_orders_customer_company_fk FOREIGN KEY (customer_id, company_id)
    REFERENCES customers(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT sales_orders_quotation_company_fk FOREIGN KEY (source_quotation_id, company_id)
    REFERENCES quotations(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT sales_orders_company_number_unique UNIQUE (company_id, order_number),
  CONSTRAINT sales_orders_source_quote_unique UNIQUE (source_quotation_id)
);
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL,
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
  CONSTRAINT sales_order_items_order_company_fk FOREIGN KEY (sales_order_id, company_id)
    REFERENCES sales_orders(id, company_id) ON DELETE CASCADE,
  CONSTRAINT sales_order_items_product_company_fk FOREIGN KEY (product_id, company_id)
    REFERENCES products(id, company_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_id_company_unique ON sales_orders(id, company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_company_created ON sales_orders(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_company_status ON sales_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_company_order ON sales_order_items(company_id, sales_order_id);
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
