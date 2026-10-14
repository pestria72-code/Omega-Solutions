-- 012_crm_full_suite.sql
-- CRM campaigns, saved segments, campaign audience tracking and customer support tickets.
CREATE TABLE IF NOT EXISTS crm_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  campaign_type VARCHAR(32) NOT NULL DEFAULT 'other' CHECK (campaign_type IN ('email','phone','event','social','referral','other')),
  status VARCHAR(24) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','paused','completed','cancelled')),
  start_date DATE,
  end_date DATE,
  budget NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  actual_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (actual_cost >= 0),
  target_leads INTEGER NOT NULL DEFAULT 0 CHECK (target_leads >= 0),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_company_status ON crm_campaigns(company_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS crm_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_dynamic BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id,name)
);
CREATE INDEX IF NOT EXISTS idx_crm_segments_company ON crm_segments(company_id,name);
CREATE TABLE IF NOT EXISTS crm_segment_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES crm_segments(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((lead_id IS NOT NULL)::int + (customer_id IS NOT NULL)::int = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_segment_member_lead ON crm_segment_members(segment_id,lead_id) WHERE lead_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_segment_member_customer ON crm_segment_members(segment_id,customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_company ON crm_segment_members(company_id,segment_id);
CREATE TABLE IF NOT EXISTS crm_campaign_segments (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES crm_segments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(campaign_id,segment_id)
);
CREATE TABLE IF NOT EXISTS crm_campaign_leads (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  response_status VARCHAR(24) NOT NULL DEFAULT 'targeted' CHECK (response_status IN ('targeted','contacted','responded','converted','unresponsive')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(campaign_id,lead_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_leads_company ON crm_campaign_leads(company_id,campaign_id,response_status);
CREATE TABLE IF NOT EXISTS crm_support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  subject VARCHAR(180) NOT NULL,
  description TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  priority VARCHAR(16) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (customer_id IS NOT NULL OR lead_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_crm_tickets_company_status ON crm_support_tickets(company_id,status,priority,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_tickets_company_assignee ON crm_support_tickets(company_id,assigned_user_id,status);
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_support_tickets ENABLE ROW LEVEL SECURITY;
