-- Workforce assignments and attendance foundation. Additive; no demo records.
CREATE TABLE IF NOT EXISTS client_sites (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 site_code VARCHAR(50) NOT NULL, site_name VARCHAR(160) NOT NULL, client_name VARCHAR(200) NOT NULL, address TEXT,
 is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(company_id,site_code), UNIQUE(id,company_id)
);
CREATE TABLE IF NOT EXISTS employee_assignments (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 employee_id UUID NOT NULL, site_id UUID NOT NULL, assignment_title VARCHAR(160),
 pay_basis VARCHAR(16) NOT NULL CHECK(pay_basis IN ('monthly','daily','hourly','per_shift')),
 pay_rate NUMERIC(14,2) NOT NULL CHECK(pay_rate>=0), currency CHAR(3) NOT NULL DEFAULT 'KES',
 start_date DATE NOT NULL, end_date DATE, status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','ended','cancelled')),
 notes TEXT, created_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK(end_date IS NULL OR end_date>=start_date),
 FOREIGN KEY(employee_id,company_id) REFERENCES employees(id,company_id) ON DELETE RESTRICT,
 FOREIGN KEY(site_id,company_id) REFERENCES client_sites(id,company_id) ON DELETE RESTRICT, UNIQUE(id,company_id)
);
CREATE INDEX IF NOT EXISTS idx_employee_assignments_company_status ON employee_assignments(company_id,status,start_date);
CREATE INDEX IF NOT EXISTS idx_employee_assignments_employee_dates ON employee_assignments(company_id,employee_id,start_date DESC);
CREATE TABLE IF NOT EXISTS attendance_records (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 employee_id UUID NOT NULL, assignment_id UUID, punch_type VARCHAR(8) NOT NULL CHECK(punch_type IN ('in','out')),
 punched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), source VARCHAR(20) NOT NULL DEFAULT 'web' CHECK(source IN ('web','mobile','qr','supervisor','import')),
 note TEXT, external_reference VARCHAR(160), recorded_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY(employee_id,company_id) REFERENCES employees(id,company_id) ON DELETE RESTRICT,
 FOREIGN KEY(assignment_id,company_id) REFERENCES employee_assignments(id,company_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_external_reference ON attendance_records(company_id,external_reference) WHERE external_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_company_employee_time ON attendance_records(company_id,employee_id,punched_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_company_assignment_time ON attendance_records(company_id,assignment_id,punched_at DESC);
ALTER TABLE client_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
INSERT INTO permissions(permission,description,category) VALUES
 ('attendance:read','View attendance and timesheets','hrm'),('attendance:write','Record and correct attendance','hrm'),
 ('assignments:read','View client sites and employee assignments','hrm'),('assignments:write','Create and transfer employee assignments','hrm')
ON CONFLICT(permission) DO NOTHING;
INSERT INTO role_permissions(role,permission_id) SELECT 'owner',id FROM permissions WHERE permission IN ('attendance:read','attendance:write','assignments:read','assignments:write') ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id) SELECT 'admin',id FROM permissions WHERE permission IN ('attendance:read','attendance:write','assignments:read','assignments:write') ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id) SELECT 'manager',id FROM permissions WHERE permission IN ('attendance:read','attendance:write','assignments:read','assignments:write') ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id) SELECT 'staff',id FROM permissions WHERE permission IN ('attendance:read','attendance:write') ON CONFLICT(role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id) SELECT 'viewer',id FROM permissions WHERE permission IN ('attendance:read','assignments:read') ON CONFLICT(role,permission_id) DO NOTHING;
