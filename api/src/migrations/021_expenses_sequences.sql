CREATE TABLE IF NOT EXISTS expense_sequences (
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 expense_year INTEGER NOT NULL,
 next_number INTEGER NOT NULL DEFAULT 1 CHECK(next_number>0),
 PRIMARY KEY(company_id,expense_year)
);
ALTER TABLE expense_sequences ENABLE ROW LEVEL SECURITY;
