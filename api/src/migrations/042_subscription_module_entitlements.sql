-- 042_subscription_module_entitlements.sql
-- Subscription catalog and company-scoped subscription requests.
-- Existing companies are intentionally not auto-assigned a paid plan: no current
-- customers are locked out while payment collection and entitlement enforcement are rolled out.
CREATE TABLE IF NOT EXISTS subscription_plans (
  code VARCHAR(30) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  monthly_price_kes INTEGER NOT NULL CHECK (monthly_price_kes >= 0),
  max_users INTEGER NOT NULL CHECK (max_users > 0),
  max_branches INTEGER NOT NULL CHECK (max_branches > 0),
  modules TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans
  (code, name, description, monthly_price_kes, max_users, max_branches, modules)
VALUES
  ('starter', 'Starter', 'Essential sales and stock control for small businesses', 1500, 2, 1,
   ARRAY['core','inventory','sales','pos','reports']),
  ('business', 'Business', 'Connected sales, finance, procurement and customer management', 3000, 5, 3,
   ARRAY['core','inventory','sales','pos','reports','accounting','procurement','crm']),
  ('enterprise', 'Enterprise', 'Advanced ERP for complex and multi-branch operations', 6000, 10, 5,
   ARRAY['core','inventory','sales','pos','reports','accounting','procurement','crm','manufacturing','hr_workforce'])
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price_kes = EXCLUDED.monthly_price_kes,
  max_users = EXCLUDED.max_users,
  max_branches = EXCLUDED.max_branches,
  modules = EXCLUDED.modules,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS company_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  plan_code VARCHAR(30) NOT NULL REFERENCES subscription_plans(code),
  status VARCHAR(30) NOT NULL CHECK (status IN ('pending_payment','trialing','active','past_due','cancelled','suspended')),
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','annual')),
  started_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_plan_code VARCHAR(30) NOT NULL REFERENCES subscription_plans(code),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_change_requests_company_created
  ON subscription_change_requests(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS company_module_overrides (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_code VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, module_code)
);
