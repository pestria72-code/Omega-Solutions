-- 020_hrm_foundation.sql
-- Tenant-scoped HR records and leave workflow; no seeded employee or payroll data.
CREATE TABLE IF NOT EXISTS employees (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 branch_id UUID,
 employee_number VARCHAR(50) NOT NULL,
 first_name VARCHAR(100) NOT NULL,
 last_name VARCHAR(100) NOT NULL,
 work_email VARCHAR(320),
 phone VARCHAR(40),
 job_title VARCHAR(160),
 department VARCHAR(120),
 employment_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active','on_leave','inactive','terminated')),
 hire_date DATE,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT employees_id_company_unique UNIQUE(id,company_id),
 CONSTRAINT employees_number_company_unique UNIQUE(company_id,employee_number),
 CONSTRAINT employees_branch_company_fk FOREIGN KEY(branch_id,company_id) REFERENCES branches(id,company_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_employees_company_status ON employees(company_id,employment_status,last_name,first_name);
CREATE TABLE IF NOT EXISTS employee_leave_requests (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 employee_id UUID NOT NULL,
 leave_type VARCHAR(24) NOT NULL CHECK (leave_type IN ('annual','sick','maternity','paternity','compassionate','unpaid','other')),
 start_date DATE NOT NULL,
 end_date DATE NOT NULL,
 reason TEXT,
 status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
 reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
 reviewed_at TIMESTAMPTZ,
 review_note TEXT,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT employee_leave_dates_valid CHECK (end_date >= start_date),
 CONSTRAINT employee_leave_employee_company_fk FOREIGN KEY(employee_id,company_id) REFERENCES employees(id,company_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_employee_leave_company_status_dates ON employee_leave_requests(company_id,status,start_date,end_date);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave_requests ENABLE ROW LEVEL SECURITY;
