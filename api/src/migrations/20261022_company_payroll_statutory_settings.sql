CREATE TABLE IF NOT EXISTS company_payroll_statutory_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 effective_from date NOT NULL,
 nssf_method text NOT NULL DEFAULT 'YEAR4' CHECK (nssf_method IN ('YEAR4','LEGACY_FLAT_200','CUSTOM')),
 nssf_employee_flat numeric(14,2) NOT NULL DEFAULT 200 CHECK (nssf_employee_flat >= 0),
 nssf_employer_flat numeric(14,2) NOT NULL DEFAULT 200 CHECK (nssf_employer_flat >= 0),
 nssf_employee_rate numeric(8,6) NOT NULL DEFAULT 0.06 CHECK (nssf_employee_rate BETWEEN 0 AND 1),
 nssf_employer_rate numeric(8,6) NOT NULL DEFAULT 0.06 CHECK (nssf_employer_rate BETWEEN 0 AND 1),
 nssf_pensionable_pay_cap numeric(14,2) NOT NULL DEFAULT 108000 CHECK (nssf_pensionable_pay_cap >= 0),
 housing_levy_enabled boolean NOT NULL DEFAULT true,
 housing_levy_employee_rate numeric(8,6) NOT NULL DEFAULT 0.015 CHECK (housing_levy_employee_rate BETWEEN 0 AND 1),
 housing_levy_employer_rate numeric(8,6) NOT NULL DEFAULT 0.015 CHECK (housing_levy_employer_rate BETWEEN 0 AND 1),
 created_by uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,effective_from)
);
CREATE INDEX IF NOT EXISTS company_payroll_statutory_settings_effective_idx
 ON company_payroll_statutory_settings(company_id,effective_from DESC);
