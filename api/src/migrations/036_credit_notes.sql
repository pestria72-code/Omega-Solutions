-- 036_credit_notes.sql
-- Credit notes preserve the original invoice while tracking credit adjustments separately.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS credited_amount NUMERIC(14,2) NOT NULL DEFAULT 0
  CHECK (credited_amount >= 0);

CREATE TABLE IF NOT EXISTS credit_note_sequences (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  credit_year INTEGER NOT NULL CHECK (credit_year BETWEEN 2000 AND 9999),
  next_number INTEGER NOT NULL DEFAULT 1 CHECK (next_number > 0),
  PRIMARY KEY (company_id, credit_year)
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  credit_note_number VARCHAR(40) NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason VARCHAR(1000) NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal > 0),
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total > 0),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_notes_company_number_unique UNIQUE(company_id, credit_note_number),
  CONSTRAINT credit_notes_id_company_unique UNIQUE(id, company_id)
);

CREATE TABLE IF NOT EXISTS credit_note_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  credit_note_id UUID NOT NULL,
  description VARCHAR(200) NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK(quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK(unit_price >= 0),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK(tax_rate >= 0 AND tax_rate <= 100),
  line_subtotal NUMERIC(14,2) NOT NULL CHECK(line_subtotal > 0),
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(tax_amount >= 0),
  line_total NUMERIC(14,2) NOT NULL CHECK(line_total > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_note_items_note_company_fk FOREIGN KEY(credit_note_id, company_id)
    REFERENCES credit_notes(id, company_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_company_invoice ON credit_notes(company_id, invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_company_note ON credit_note_items(company_id, credit_note_id);
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;

INSERT INTO permissions(permission,description,category) VALUES
 ('credit-notes:read','View customer credit notes','sales'),
 ('credit-notes:write','Create customer credit notes and reduce receivables','sales')
ON CONFLICT(permission) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'owner',id FROM permissions WHERE permission IN ('credit-notes:read','credit-notes:write')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'admin',id FROM permissions WHERE permission IN ('credit-notes:read','credit-notes:write')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'manager',id FROM permissions WHERE permission='credit-notes:read'
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'staff',id FROM permissions WHERE permission='credit-notes:read'
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'viewer',id FROM permissions WHERE permission='credit-notes:read'
ON CONFLICT(role,permission_id) DO NOTHING;
