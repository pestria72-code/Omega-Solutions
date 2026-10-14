export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'converted';

export interface QuotationRow {
  [key: string]: unknown;
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  quotation_number: string;
  issue_date: string;
  valid_until: string;
  status: QuotationStatus;
  currency: string;
  subtotal: string | number;
  tax_amount: string | number;
  total: string | number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
  items?: QuotationItemRow[];
}

export interface QuotationItemRow {
  [key: string]: unknown;
  id: string;
  quotation_id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: string | number;
  unit_price: string | number;
  tax_rate: string | number;
  line_subtotal: string | number;
  tax_amount: string | number;
  line_total: string | number;
}
