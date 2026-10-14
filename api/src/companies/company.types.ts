export interface CompanyRow {
  [key: string]: unknown;
  id: string;
  name: string;
  registration_number: string | null;
  vat_number: string | null;
  currency: string;
  timezone: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
