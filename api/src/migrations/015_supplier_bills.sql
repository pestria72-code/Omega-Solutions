-- Supplier bills and accounts payable, company-scoped and linked optionally to purchase orders.
CREATE TABLE IF NOT EXISTS supplier_bills (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 supplier_id UUID NOT NULL,
 purchase_order_id UUID,
 bill_number VARCHAR(60) NOT NULL,
 supplier_invoice_number VARCHAR(120),
 bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
 due_date DATE,
 currency VARCHAR(3) NOT NULL DEFAULT 'KES',
 status VARCHAR(24) NOT NULL DEFAULT 'open' CHECK(status IN ('open','partially_paid','paid','void')),
 subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(subtotal>=0),
 tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(tax_amount>=0),
 total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(total>=0),
 paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(paid_amount>=0 AND paid_amount<=total),
 notes VARCHAR(2000),
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT supplier_bills_supplier_company_fk FOREIGN KEY(supplier_id,company_id) REFERENCES suppliers(id,company_id) ON DELETE RESTRICT,
 CONSTRAINT supplier_bills_order_company_fk FOREIGN KEY(purchase_order_id,company_id) REFERENCES purchase_orders(id,company_id) ON DELETE RESTRICT,
 CONSTRAINT supplier_bills_company_number_unique UNIQUE(company_id,bill_number),
 CONSTRAINT supplier_bills_id_company_unique UNIQUE(id,company_id)
);
CREATE TABLE IF NOT EXISTS supplier_bill_items (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 supplier_bill_id UUID NOT NULL,
 purchase_order_item_id UUID,
 description VARCHAR(250) NOT NULL,
 quantity NUMERIC(14,3) NOT NULL CHECK(quantity>0),
 unit_cost NUMERIC(14,2) NOT NULL CHECK(unit_cost>=0),
 tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK(tax_rate>=0 AND tax_rate<=100),
 line_subtotal NUMERIC(14,2) NOT NULL CHECK(line_subtotal>=0),
 tax_amount NUMERIC(14,2) NOT NULL CHECK(tax_amount>=0),
 line_total NUMERIC(14,2) NOT NULL CHECK(line_total>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT supplier_bill_items_bill_company_fk FOREIGN KEY(supplier_bill_id,company_id) REFERENCES supplier_bills(id,company_id) ON DELETE CASCADE,
 CONSTRAINT supplier_bill_items_po_item_company_fk FOREIGN KEY(purchase_order_item_id,company_id) REFERENCES purchase_order_items(id,company_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS supplier_bill_payments (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 supplier_bill_id UUID NOT NULL,
 amount NUMERIC(14,2) NOT NULL CHECK(amount>0),
 payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
 method VARCHAR(24) NOT NULL CHECK(method IN ('bank_transfer','mpesa','cash','cheque','card','other')),
 reference VARCHAR(120),
 notes VARCHAR(1000),
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT supplier_bill_payments_bill_company_fk FOREIGN KEY(supplier_bill_id,company_id) REFERENCES supplier_bills(id,company_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS supplier_bill_sequences (
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 bill_year INTEGER NOT NULL CHECK(bill_year BETWEEN 2000 AND 9999),
 next_number INTEGER NOT NULL DEFAULT 1 CHECK(next_number>0),
 PRIMARY KEY(company_id,bill_year)
);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_company_due ON supplier_bills(company_id,due_date,status);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_company_supplier ON supplier_bills(company_id,supplier_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_bill_items_company_bill ON supplier_bill_items(company_id,supplier_bill_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bill_payments_company_bill ON supplier_bill_payments(company_id,supplier_bill_id,payment_date DESC);
ALTER TABLE supplier_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bill_payments ENABLE ROW LEVEL SECURITY;
