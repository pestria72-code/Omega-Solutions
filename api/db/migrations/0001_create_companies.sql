-- Omega Solutions: company profile foundation
-- Requires Neon Auth's existing neon_auth.organization table.
-- Each ERP company belongs to one authenticated organization.

BEGIN;

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE
    REFERENCES neon_auth.organization (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  legal_name text,
  kra_pin text UNIQUE,
  business_type text,
  phone text,
  email text,
  county text,
  address text,
  currency char(3) NOT NULL DEFAULT 'KES',
  timezone text NOT NULL DEFAULT 'Africa/Nairobi',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_display_name_not_blank
    CHECK (length(trim(display_name)) > 0),
  CONSTRAINT companies_currency_uppercase
    CHECK (currency = upper(currency))
);

CREATE INDEX IF NOT EXISTS companies_county_idx
  ON public.companies (county);

COMMIT;
