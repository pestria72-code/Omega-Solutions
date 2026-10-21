CREATE TABLE IF NOT EXISTS mpesa_stk_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  account_reference TEXT NOT NULL,
  merchant_request_id TEXT,
  checkout_request_id TEXT UNIQUE,
  response_code TEXT,
  response_description TEXT,
  result_code TEXT,
  result_description TEXT,
  mpesa_receipt_number TEXT UNIQUE,
  callback_amount NUMERIC(14,2),
  callback_phone_number TEXT,
  callback_received_at TIMESTAMPTZ,
  callback_payload JSONB,
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','pending','processing','reconciled','review','failed')),
  invoice_payment_id UUID,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mpesa_stk_requests_company_created
  ON mpesa_stk_requests(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_requests_invoice
  ON mpesa_stk_requests(company_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk_requests_status
  ON mpesa_stk_requests(status, updated_at);
