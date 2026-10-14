-- CRM foundation: tenant-scoped leads, opportunities and activity timeline.
-- Safe to apply repeatedly; existing company/customer records are not modified.
CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  contact_name varchar(180) NOT NULL,
  organization_name varchar(180),
  email varchar(320),
  phone varchar(40),
  source varchar(60),
  status varchar(24) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','qualified','unqualified','converted')),
  estimated_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (estimated_value >= 0),
  currency varchar(3) NOT NULL DEFAULT 'KES',
  notes text,
  converted_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_leads_company_status_created_idx
  ON crm_leads(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_leads_company_email_idx
  ON crm_leads(company_id, lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title varchar(180) NOT NULL,
  stage varchar(24) NOT NULL DEFAULT 'qualification'
    CHECK (stage IN ('qualification','needs_analysis','proposal','negotiation','won','lost')),
  expected_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (expected_value >= 0),
  probability integer NOT NULL DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date date,
  loss_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_opportunities_company_stage_idx
  ON crm_opportunities(company_id, stage, expected_close_date);

CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  activity_type varchar(24) NOT NULL CHECK (activity_type IN ('call','email','meeting','task','note')),
  subject varchar(180) NOT NULL,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (lead_id IS NOT NULL OR opportunity_id IS NOT NULL OR customer_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS crm_activities_company_due_idx
  ON crm_activities(company_id, due_at) WHERE completed_at IS NULL;

INSERT INTO permissions(permission, description, category)
VALUES
  ('crm:read', 'View CRM leads, opportunities and activities', 'crm'),
  ('crm:write', 'Create and update CRM leads, opportunities and activities', 'crm')
ON CONFLICT (permission) DO NOTHING;

-- Match the application's existing role-based access control defaults.
INSERT INTO role_permissions (role, permission_id)
SELECT 'owner', id FROM permissions WHERE permission IN ('crm:read', 'crm:write')
ON CONFLICT (role, permission_id) DO NOTHING;
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE permission IN ('crm:read', 'crm:write')
ON CONFLICT (role, permission_id) DO NOTHING;
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions WHERE permission IN ('crm:read', 'crm:write')
ON CONFLICT (role, permission_id) DO NOTHING;
INSERT INTO role_permissions (role, permission_id)
SELECT 'staff', id FROM permissions WHERE permission = 'crm:read'
ON CONFLICT (role, permission_id) DO NOTHING;
INSERT INTO role_permissions (role, permission_id)
SELECT 'viewer', id FROM permissions WHERE permission = 'crm:read'
ON CONFLICT (role, permission_id) DO NOTHING;
