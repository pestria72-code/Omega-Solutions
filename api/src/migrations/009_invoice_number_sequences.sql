-- 009_invoice_number_sequences.sql
-- Company-scoped invoice numbering. Safe to re-run.
CREATE TABLE IF NOT EXISTS invoice_sequences (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_year INTEGER NOT NULL CHECK (invoice_year BETWEEN 2000 AND 9999),
  next_number INTEGER NOT NULL DEFAULT 1 CHECK (next_number > 0),
  PRIMARY KEY (company_id, invoice_year)
);
