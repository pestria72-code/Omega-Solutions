export interface AuthenticatedUser {
  userId: string;
  email: string;
  fullName: string;
  companyId: string | null;
  branchId: string | null;
  role: string;
  permissions: string[];
}

export interface CompanyRow {
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

export interface BranchRow {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  details?: unknown;
}
