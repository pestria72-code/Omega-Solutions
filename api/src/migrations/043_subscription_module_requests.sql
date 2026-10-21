-- 043_subscription_module_requests.sql
-- Optional modules are requested by company owners/admins and activated only after review.
CREATE TABLE IF NOT EXISTS subscription_module_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  module_code VARCHAR(50) NOT NULL CHECK (
    module_code IN ('inventory','sales','pos','accounting','procurement','manufacturing','crm','hr_workforce','reports')
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_subscription_module_requests_company_created
  ON subscription_module_requests(company_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_module_requests_one_pending
  ON subscription_module_requests(company_id, module_code) WHERE status = 'pending';
