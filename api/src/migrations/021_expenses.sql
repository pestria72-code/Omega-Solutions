-- 021_expenses.sql
-- Business expenses are recorded with a balanced journal entry in the same transaction.
CREATE TABLE IF NOT EXISTS expenses (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 expense_number VARCHAR(40) NOT NULL,
 expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
 description VARCHAR(240) NOT NULL,
 category VARCHAR(120) NOT NULL,
 amount NUMERIC(16,2) NOT NULL CHECK(amount>0),
 payment_method VARCHAR(20) NOT NULL CHECK(payment_method IN ('cash','mpesa','bank')),
 reference VARCHAR(160),
 expense_account_id UUID NOT NULL,
 journal_entry_id UUID,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT expenses_id_company_unique UNIQUE(id,company_id),
 CONSTRAINT expenses_number_company_unique UNIQUE(company_id,expense_number),
 CONSTRAINT expenses_account_company_fk FOREIGN KEY(expense_account_id,company_id) REFERENCES chart_of_accounts(id,company_id) ON DELETE RESTRICT,
 CONSTRAINT expenses_journal_company_fk FOREIGN KEY(journal_entry_id,company_id) REFERENCES journal_entries(id,company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_expenses_company_date ON expenses(company_id,expense_date DESC);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
