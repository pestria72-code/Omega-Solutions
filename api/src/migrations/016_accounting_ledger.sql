-- Double-entry accounting foundation for accounts payable and general ledger.
CREATE TABLE IF NOT EXISTS chart_of_accounts (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 code VARCHAR(20) NOT NULL,
 name VARCHAR(160) NOT NULL,
 account_type VARCHAR(20) NOT NULL CHECK(account_type IN ('asset','liability','equity','income','expense')),
 normal_side VARCHAR(6) NOT NULL CHECK(normal_side IN ('debit','credit')),
 system_code VARCHAR(40),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT chart_of_accounts_company_code_unique UNIQUE(company_id,code),
 CONSTRAINT chart_of_accounts_id_company_unique UNIQUE(id,company_id),
 CONSTRAINT chart_of_accounts_company_system_unique UNIQUE(company_id,system_code)
);
CREATE TABLE IF NOT EXISTS journal_entries (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 entry_number VARCHAR(40) NOT NULL,
 entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
 description VARCHAR(500) NOT NULL,
 source_type VARCHAR(40),
 source_id UUID,
 status VARCHAR(16) NOT NULL DEFAULT 'posted' CHECK(status IN ('draft','posted','reversed')),
 posted_at TIMESTAMPTZ,
 posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT journal_entries_company_number_unique UNIQUE(company_id,entry_number),
 CONSTRAINT journal_entries_source_unique UNIQUE(company_id,source_type,source_id),
 CONSTRAINT journal_entries_id_company_unique UNIQUE(id,company_id)
);
CREATE TABLE IF NOT EXISTS journal_entry_lines (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 journal_entry_id UUID NOT NULL,
 account_id UUID NOT NULL,
 description VARCHAR(300),
 debit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(debit>=0),
 credit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(credit>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT journal_line_one_side CHECK ((debit>0 AND credit=0) OR (credit>0 AND debit=0)),
 CONSTRAINT journal_lines_entry_company_fk FOREIGN KEY(journal_entry_id,company_id) REFERENCES journal_entries(id,company_id) ON DELETE CASCADE,
 CONSTRAINT journal_lines_account_company_fk FOREIGN KEY(account_id,company_id) REFERENCES chart_of_accounts(id,company_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS journal_entry_sequences (
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 entry_year INTEGER NOT NULL CHECK(entry_year BETWEEN 2000 AND 9999),
 next_number INTEGER NOT NULL DEFAULT 1 CHECK(next_number>0),
 PRIMARY KEY(company_id,entry_year)
);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_company_type ON chart_of_accounts(company_id,account_type,is_active);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id,entry_date DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_source ON journal_entries(company_id,source_type,source_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_company_account ON journal_entry_lines(company_id,account_id,journal_entry_id);
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

INSERT INTO permissions(permission,description,category) VALUES
 ('accounting:read','View chart of accounts and general ledger','accounting'),
 ('accounting:write','Manage chart of accounts','accounting')
ON CONFLICT(permission) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'owner',id FROM permissions WHERE permission IN ('accounting:read','accounting:write')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'admin',id FROM permissions WHERE permission IN ('accounting:read','accounting:write')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'manager',id FROM permissions WHERE permission='accounting:read'
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'viewer',id FROM permissions WHERE permission='accounting:read'
ON CONFLICT(role,permission_id) DO NOTHING;
