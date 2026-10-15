-- Payroll configuration and immutable calculation snapshots. No sample employees or payroll data.
ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_company_system_unique;
ALTER TABLE chart_of_accounts ADD CONSTRAINT chart_of_accounts_company_system_unique UNIQUE(company_id,system_code);

INSERT INTO chart_of_accounts(company_id,code,name,account_type,normal_side,system_code)
SELECT c.id,a.code,a.name,a.account_type,a.normal_side,a.system_code
FROM companies c CROSS JOIN (VALUES
 ('5200','Salaries and Wages','expense','debit','payroll_wages'),
 ('5210','Employer Payroll Contributions','expense','debit','payroll_employer_contributions'),
 ('2200','Net Payroll Payable','liability','credit','payroll_net_payable'),
 ('2210','PAYE Payable','liability','credit','payroll_paye_payable'),
 ('2220','SHIF Payable','liability','credit','payroll_shif_payable'),
 ('2230','NSSF Payable','liability','credit','payroll_nssf_payable'),
 ('2240','Housing Levy Payable','liability','credit','payroll_housing_levy_payable'),
 ('2250','Employee Pension Payable','liability','credit','payroll_pension_payable'),
 ('2260','Post-Retirement Medical Payable','liability','credit','payroll_prmf_payable')
) AS a(code,name,account_type,normal_side,system_code)
ON CONFLICT(company_id,code) DO NOTHING;

CREATE TABLE IF NOT EXISTS employee_pay_settings (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL,
 employee_id UUID NOT NULL,
 monthly_basic_salary NUMERIC(14,2) NOT NULL CHECK(monthly_basic_salary>=0),
 monthly_taxable_allowances NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(monthly_taxable_allowances>=0),
 monthly_taxable_benefits NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(monthly_taxable_benefits>=0),
 employee_pension_contribution NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(employee_pension_contribution>=0),
 post_retirement_medical_contribution NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(post_retirement_medical_contribution>=0),
 qualifying_mortgage_interest NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(qualifying_mortgage_interest>=0),
 eligible_insurance_premiums NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(eligible_insurance_premiums>=0),
 resident_for_tax_purposes BOOLEAN NOT NULL DEFAULT TRUE,
 effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT employee_pay_settings_effective_unique UNIQUE(company_id,employee_id,effective_from),
 CONSTRAINT employee_pay_settings_employee_company_fk FOREIGN KEY(employee_id,company_id) REFERENCES employees(id,company_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_employee_pay_settings_company ON employee_pay_settings(company_id,effective_from);
CREATE TABLE IF NOT EXISTS payroll_runs (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 period_start DATE NOT NULL,
 period_end DATE NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','posted','cancelled')),
 employee_count INTEGER NOT NULL DEFAULT 0 CHECK(employee_count>=0),
 gross_total NUMERIC(16,2) NOT NULL DEFAULT 0,
 employee_deductions_total NUMERIC(16,2) NOT NULL DEFAULT 0,
 net_pay_total NUMERIC(16,2) NOT NULL DEFAULT 0,
 employer_cost_total NUMERIC(16,2) NOT NULL DEFAULT 0,
 journal_entry_id UUID,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
 approved_at TIMESTAMPTZ,
 posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
 posted_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT payroll_run_period_valid CHECK(period_end>=period_start),
 CONSTRAINT payroll_run_period_company_unique UNIQUE(company_id,period_start,period_end),
 CONSTRAINT payroll_runs_id_company_unique UNIQUE(id,company_id),
 CONSTRAINT payroll_runs_journal_company_fk FOREIGN KEY(journal_entry_id,company_id) REFERENCES journal_entries(id,company_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS payroll_items (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL,
 payroll_run_id UUID NOT NULL,
 employee_id UUID NOT NULL,
 employee_number VARCHAR(50) NOT NULL,
 employee_name VARCHAR(201) NOT NULL,
 gross_cash_pay NUMERIC(14,2) NOT NULL,
 taxable_benefits NUMERIC(14,2) NOT NULL DEFAULT 0,
 nssf_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
 nssf_employer NUMERIC(14,2) NOT NULL DEFAULT 0,
 shif_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
 housing_levy_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
 housing_levy_employer NUMERIC(14,2) NOT NULL DEFAULT 0,
 paye NUMERIC(14,2) NOT NULL DEFAULT 0,
 pension_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
 prmf_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
 employee_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
 net_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
 employer_statutory_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
 calculation_snapshot JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT payroll_items_employee_run_unique UNIQUE(payroll_run_id,employee_id),
 CONSTRAINT payroll_items_run_company_fk FOREIGN KEY(payroll_run_id,company_id) REFERENCES payroll_runs(id,company_id) ON DELETE CASCADE,
 CONSTRAINT payroll_items_employee_company_fk FOREIGN KEY(employee_id,company_id) REFERENCES employees(id,company_id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS payroll_journal_sequences (
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 entry_year INTEGER NOT NULL CHECK(entry_year BETWEEN 2000 AND 9999),
 next_number INTEGER NOT NULL DEFAULT 1 CHECK(next_number>0),
 PRIMARY KEY(company_id,entry_year)
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company_period ON payroll_runs(company_id,period_start DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_items_company_run ON payroll_items(company_id,payroll_run_id);
ALTER TABLE employee_pay_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_journal_sequences ENABLE ROW LEVEL SECURITY;

INSERT INTO permissions(permission,description,category) VALUES
 ('payroll:read','View payroll settings, runs and payslips','payroll'),
 ('payroll:write','Configure employee pay and prepare payroll runs','payroll'),
 ('payroll:approve','Approve payroll runs and post payroll journals','payroll')
ON CONFLICT(permission) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'owner',id FROM permissions WHERE permission IN ('payroll:read','payroll:write','payroll:approve')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'admin',id FROM permissions WHERE permission IN ('payroll:read','payroll:write','payroll:approve')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'manager',id FROM permissions WHERE permission IN ('payroll:read','payroll:write')
ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'viewer',id FROM permissions WHERE permission='payroll:read'
ON CONFLICT(role,permission_id) DO NOTHING;
