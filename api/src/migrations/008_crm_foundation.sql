-- 008_crm_foundation.sql
CREATE TABLE IF NOT EXISTS crm_leads (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 contact_name VARCHAR(180) NOT NULL,
 organization_name VARCHAR(180),
 email CITEXT,
 phone VARCHAR(40),
 source VARCHAR(60),
 status VARCHAR(24) NOT NULL DEFAULT 'new' CHECK (status IN ('new','qualified','unqualified','converted')),
 estimated_value NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (estimated_value >= 0),
 currency VARCHAR(3) NOT NULL DEFAULT 'KES',
 notes TEXT,
 converted_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_company_status_created ON crm_leads(company_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_company_email ON crm_leads(company_id,email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm_opportunities (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
 customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
 owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 title VARCHAR(180) NOT NULL,
 stage VARCHAR(24) NOT NULL DEFAULT 'qualification' CHECK (stage IN ('qualification','needs_analysis','proposal','negotiation','won','lost')),
 expected_value NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (expected_value >= 0),
 probability INTEGER NOT NULL DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
 expected_close_date DATE,
 loss_reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK (lead_id IS NOT NULL OR customer_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_company_stage ON crm_opportunities(company_id,stage,expected_close_date);

CREATE TABLE IF NOT EXISTS crm_activities (
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
 opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE CASCADE,
 customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
 assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
 activity_type VARCHAR(24) NOT NULL CHECK (activity_type IN ('call','email','meeting','task','note')),
 subject VARCHAR(180) NOT NULL,
 description TEXT,
 due_at TIMESTAMPTZ,
 completed_at TIMESTAMPTZ,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK (lead_id IS NOT NULL OR opportunity_id IS NOT NULL OR customer_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_crm_activities_company_due ON crm_activities(company_id,due_at) WHERE completed_at IS NULL;

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

INSERT INTO permissions(permission,description,category) VALUES
 ('crm:read','View CRM leads, opportunities and activities','crm'),
 ('crm:write','Create and update CRM leads, opportunities and activities','crm')
ON CONFLICT (permission) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'owner',id FROM permissions WHERE permission IN ('crm:read','crm:write')
ON CONFLICT (role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'admin',id FROM permissions WHERE permission IN ('crm:read','crm:write')
ON CONFLICT (role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'manager',id FROM permissions WHERE permission IN ('crm:read','crm:write')
ON CONFLICT (role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'staff',id FROM permissions WHERE permission = 'crm:read'
ON CONFLICT (role,permission_id) DO NOTHING;
INSERT INTO role_permissions(role,permission_id)
SELECT 'viewer',id FROM permissions WHERE permission = 'crm:read'
ON CONFLICT (role,permission_id) DO NOTHING;
