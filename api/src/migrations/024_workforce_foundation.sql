-- 024_workforce_foundation.sql
-- Tenant-scoped client sites, employee assignments, and attendance ledger.
-- Intentionally creates schema only; no sample workforce records are inserted.
CREATE TABLE IF NOT EXISTS client_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_code VARCHAR(50) NOT NULL,
  site_name VARCHAR(160) NOT NULL,
  client_name VARCHAR(160) NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_sites_id_company_unique UNIQUE (id, company_id),
  CONSTRAINT client_sites_code_company_unique UNIQUE (company_id, site_code)
);
CREATE INDEX IF NOT EXISTS idx_client_sites_company_active
  ON client_sites(company_id, is_active, client_name, site_name);

CREATE TABLE IF NOT EXISTS employee_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  site_id UUID NOT NULL,
  assignment_title VARCHAR(160),
  pay_basis VARCHAR(20) NOT NULL CHECK (pay_basis IN ('monthly','daily','hourly','per_shift')),
  pay_rate NUMERIC(14,2) NOT NULL CHECK (pay_rate >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'KES' CHECK (currency ~ '^[A-Z]{3}$'),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','cancelled')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_assignments_dates_valid CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT employee_assignments_id_company_unique UNIQUE (id, company_id),
  CONSTRAINT employee_assignments_employee_company_fk
    FOREIGN KEY (employee_id, company_id) REFERENCES employees(id, company_id) ON DELETE CASCADE,
  CONSTRAINT employee_assignments_site_company_fk
    FOREIGN KEY (site_id, company_id) REFERENCES client_sites(id, company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_employee_assignments_company_employee_dates
  ON employee_assignments(company_id, employee_id, start_date DESC, end_date);
CREATE INDEX IF NOT EXISTS idx_employee_assignments_company_status
  ON employee_assignments(company_id, status, start_date DESC);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  assignment_id UUID,
  punch_type VARCHAR(8) NOT NULL CHECK (punch_type IN ('in','out')),
  punched_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'web' CHECK (source IN ('web','mobile','qr','supervisor','import')),
  note TEXT,
  external_reference TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_records_employee_company_fk
    FOREIGN KEY (employee_id, company_id) REFERENCES employees(id, company_id) ON DELETE CASCADE,
  CONSTRAINT attendance_records_assignment_company_fk
    FOREIGN KEY (assignment_id, company_id) REFERENCES employee_assignments(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT attendance_records_external_reference_company_unique UNIQUE (company_id, external_reference)
);
CREATE INDEX IF NOT EXISTS idx_attendance_records_company_employee_time
  ON attendance_records(company_id, employee_id, punched_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_company_time
  ON attendance_records(company_id, punched_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_assignment
  ON attendance_records(company_id, assignment_id) WHERE assignment_id IS NOT NULL;

ALTER TABLE client_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

INSERT INTO permissions(permission, description, category) VALUES
  ('attendance:read','View workforce attendance records','workforce'),
  ('attendance:write','Record employee clock-in and clock-out events','workforce'),
  ('assignments:read','View client sites and employee assignments','workforce'),
  ('assignments:write','Manage client sites and employee assignments','workforce')
ON CONFLICT(permission) DO NOTHING;

INSERT INTO role_permissions(role, permission_id)
SELECT 'owner', id FROM permissions
WHERE permission IN ('attendance:read','attendance:write','assignments:read','assignments:write')
ON CONFLICT(role, permission_id) DO NOTHING;
INSERT INTO role_permissions(role, permission_id)
SELECT 'admin', id FROM permissions
WHERE permission IN ('attendance:read','attendance:write','assignments:read','assignments:write')
ON CONFLICT(role, permission_id) DO NOTHING;
INSERT INTO role_permissions(role, permission_id)
SELECT 'manager', id FROM permissions
WHERE permission IN ('attendance:read','attendance:write','assignments:read','assignments:write')
ON CONFLICT(role, permission_id) DO NOTHING;
INSERT INTO role_permissions(role, permission_id)
SELECT 'staff', id FROM permissions
WHERE permission IN ('attendance:read','attendance:write')
ON CONFLICT(role, permission_id) DO NOTHING;
INSERT INTO role_permissions(role, permission_id)
SELECT 'viewer', id FROM permissions
WHERE permission IN ('attendance:read','assignments:read')
ON CONFLICT(role, permission_id) DO NOTHING;
