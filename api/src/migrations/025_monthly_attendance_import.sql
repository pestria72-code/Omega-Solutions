-- 025_monthly_attendance_import.sql
-- Adds national-ID matching and HR monthly checklist imports; no demo data.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS national_id VARCHAR(32);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_national_id
  ON employees(company_id, regexp_replace(upper(national_id), '[^A-Z0-9]', '', 'g'))
  WHERE national_id IS NOT NULL AND btrim(national_id) <> '';

CREATE TABLE IF NOT EXISTS monthly_attendance_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  source_type VARCHAR(16) NOT NULL DEFAULT 'csv' CHECK (source_type IN ('csv','spreadsheet','scan','manual')),
  source_filename VARCHAR(255),
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end >= period_start),
  CHECK (date_trunc('month', period_start::timestamp) = period_start::timestamp),
  CHECK (period_end = (period_start + INTERVAL '1 month - 1 day')::date),
  UNIQUE (id, company_id)
);
CREATE INDEX IF NOT EXISTS idx_monthly_attendance_imports_company_period
  ON monthly_attendance_imports(company_id, period_start DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS monthly_attendance_import_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL,
  import_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  national_id_last4 CHAR(4) NOT NULL,
  employee_name_snapshot VARCHAR(201) NOT NULL,
  site_id UUID,
  scheduled_days SMALLINT NOT NULL CHECK (scheduled_days BETWEEN 0 AND 31),
  present_days SMALLINT NOT NULL CHECK (present_days BETWEEN 0 AND 31),
  absent_days SMALLINT NOT NULL CHECK (absent_days BETWEEN 0 AND 31),
  leave_days SMALLINT NOT NULL CHECK (leave_days BETWEEN 0 AND 31),
  rest_days SMALLINT NOT NULL CHECK (rest_days BETWEEN 0 AND 31),
  unresolved_days SMALLINT NOT NULL CHECK (unresolved_days BETWEEN 0 AND 31),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT monthly_attendance_item_days_reconcile CHECK (present_days + absent_days + leave_days + unresolved_days = scheduled_days),
  CONSTRAINT monthly_attendance_item_import_company_fk FOREIGN KEY (import_id, company_id)
    REFERENCES monthly_attendance_imports(id, company_id) ON DELETE CASCADE,
  CONSTRAINT monthly_attendance_item_employee_company_fk FOREIGN KEY (employee_id, company_id)
    REFERENCES employees(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT monthly_attendance_item_site_company_fk FOREIGN KEY (site_id, company_id)
    REFERENCES client_sites(id, company_id) ON DELETE RESTRICT,
  UNIQUE (import_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_monthly_attendance_items_company_employee
  ON monthly_attendance_import_items(company_id, employee_id, created_at DESC);
ALTER TABLE monthly_attendance_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_attendance_import_items ENABLE ROW LEVEL SECURITY;

INSERT INTO permissions(permission, description, category) VALUES
  ('attendance:read','View workforce attendance records and monthly registers','workforce'),
  ('attendance:write','Record attendance and import monthly checklists','workforce')
ON CONFLICT(permission) DO NOTHING;
INSERT INTO role_permissions(role, permission_id)
SELECT role_name::user_role, p.id
FROM (VALUES ('owner'),('admin'),('manager')) AS roles(role_name)
CROSS JOIN permissions p
WHERE p.permission IN ('attendance:read','attendance:write')
ON CONFLICT(role, permission_id) DO NOTHING;
