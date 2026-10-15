-- Company-scoped purchase orders with partial receipts and stock-ledger integration.
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_id_company_unique ON suppliers(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_id_company_unique ON products(id, company_id);
CREATE TABLE IF NOT EXISTS purchase_orders (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 supplier_id UUID NOT NULL, order_number VARCHAR(40) NOT NULL,
 order_date DATE NOT NULL DEFAULT CURRENT_DATE, expected_date DATE,
 status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ordered','partially_received','received','cancelled')),
 currency VARCHAR(3) NOT NULL DEFAULT 'KES',
 subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(subtotal>=0),
 tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(tax_amount>=0),
 total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(total>=0),
 notes VARCHAR(2000), created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT purchase_orders_supplier_company_fk FOREIGN KEY(supplier_id,company_id) REFERENCES suppliers(id,company_id) ON DELETE RESTRICT,
 CONSTRAINT purchase_orders_company_number_unique UNIQUE(company_id,order_number),
 CONSTRAINT purchase_orders_id_company_unique UNIQUE(id,company_id)
);
CREATE TABLE IF NOT EXISTS purchase_order_items (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 purchase_order_id UUID NOT NULL, product_id UUID NOT NULL, product_name VARCHAR(200) NOT NULL, sku VARCHAR(50),
 quantity NUMERIC(14,3) NOT NULL CHECK(quantity>0), received_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK(received_quantity>=0 AND received_quantity<=quantity),
 unit_cost NUMERIC(14,2) NOT NULL CHECK(unit_cost>=0), tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK(tax_rate>=0 AND tax_rate<=100),
 line_subtotal NUMERIC(14,2) NOT NULL CHECK(line_subtotal>=0), tax_amount NUMERIC(14,2) NOT NULL CHECK(tax_amount>=0), line_total NUMERIC(14,2) NOT NULL CHECK(line_total>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT purchase_order_items_order_company_fk FOREIGN KEY(purchase_order_id,company_id) REFERENCES purchase_orders(id,company_id) ON DELETE CASCADE,
 CONSTRAINT purchase_order_items_product_company_fk FOREIGN KEY(product_id,company_id) REFERENCES products(id,company_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS purchase_order_sequences (
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, order_year INTEGER NOT NULL CHECK(order_year BETWEEN 2000 AND 9999),
 next_number INTEGER NOT NULL DEFAULT 1 CHECK(next_number>0), PRIMARY KEY(company_id,order_year)
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_created ON purchase_orders(company_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_status ON purchase_orders(company_id,status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_company_order ON purchase_order_items(company_id,purchase_order_id);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
