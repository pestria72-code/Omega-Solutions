-- 046_subscription_paystack_payments.sql
-- Tenant-scoped payment ledger for Omega subscription checkout. No live provider credentials are stored in the database.
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  plan_code VARCHAR(50) NOT NULL REFERENCES subscription_plans(code),
  provider VARCHAR(30) NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  reference VARCHAR(100) NOT NULL UNIQUE,
  amount_kes INTEGER NOT NULL CHECK (amount_kes > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'KES' CHECK (currency = 'KES'),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','abandoned')),
  authorization_url TEXT,
  provider_transaction_id VARCHAR(100),
  provider_payload JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_company_created
  ON subscription_payments(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_pending_created
  ON subscription_payments(created_at) WHERE status = 'pending';
