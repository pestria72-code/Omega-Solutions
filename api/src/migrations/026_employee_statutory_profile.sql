-- Employee statutory identifiers are company-scoped employee attributes.
-- Values are optional during onboarding; payroll validation handles missing statutory data.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS kra_pin VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nssf_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS sha_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS nhif_number VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS employees_company_kra_pin_unique
  ON employees(company_id, kra_pin)
  WHERE kra_pin IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_company_nssf_number_unique
  ON employees(company_id, nssf_number)
  WHERE nssf_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_company_sha_number_unique
  ON employees(company_id, sha_number)
  WHERE sha_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_company_nhif_number_unique
  ON employees(company_id, nhif_number)
  WHERE nhif_number IS NOT NULL;

COMMENT ON COLUMN employees.kra_pin IS 'KRA PIN; sensitive statutory identifier, never return in ordinary employee listings.';
COMMENT ON COLUMN employees.nssf_number IS 'NSSF membership number; sensitive statutory identifier.';
COMMENT ON COLUMN employees.sha_number IS 'Current SHA/SHIF membership number; sensitive statutory identifier.';
COMMENT ON COLUMN employees.nhif_number IS 'Optional legacy NHIF membership number retained for migration/history.';
